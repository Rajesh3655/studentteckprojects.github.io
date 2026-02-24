import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const HACKATHONS_FILE = path.join(ROOT, 'data', 'hackathons.json');
const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3/events/search/';
const DEVPOST_API_BASE = 'https://devpost.com/api/hackathons';
const FETCH_PAGE_SIZE = 50;
const LAST_24H_MS = 24 * 60 * 60 * 1000;

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function uniqueSlug(baseSlug, usedSlugs) {
  const base = baseSlug || 'hackathon-event';
  let slug = base;
  let i = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${i}`;
    i += 1;
  }
  usedSlugs.add(slug);
  return slug;
}

function stripHtml(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toIsoDate(input) {
  if (!input) return new Date().toISOString().slice(0, 10);
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function parseDateValue(input) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isWithinLast24Hours(input) {
  const d = parseDateValue(input);
  if (!d) return false;
  return Date.now() - d.getTime() <= LAST_24H_MS;
}

function excerptFromDescription(value) {
  const clean = stripHtml(value);
  if (!clean) return 'Join this hackathon and apply through the official Eventbrite link.';
  return clean.length > 220 ? `${clean.slice(0, 217)}...` : clean;
}

async function fetchEventbrite(query, rangeStartIso) {
  const token = process.env.EVENTBRITE_API_TOKEN;
  if (!token) {
    console.log('EVENTBRITE_API_TOKEN not set. Skipping Eventbrite source.');
    return [];
  }

  const events = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      q: query,
      sort_by: 'date',
      expand: 'venue,organizer',
      page: String(page),
      page_size: String(FETCH_PAGE_SIZE),
      'start_date.range_start': rangeStartIso
    });

    const response = await fetch(`${EVENTBRITE_API_BASE}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Eventbrite API failed (${response.status}): ${body.slice(0, 300)}`);
    }

    const payload = await response.json();
    const list = Array.isArray(payload.events) ? payload.events : [];
    events.push(...list);

    hasMore = Boolean(payload.pagination && payload.pagination.has_more_items);
    page += 1;
  }

  return events;
}

async function fetchDevpostOpenHackathons() {
  const response = await fetch(`${DEVPOST_API_BASE}?status[]=open&page=1`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Devpost API failed (${response.status}): ${body.slice(0, 300)}`);
  }
  const payload = await response.json();
  return Array.isArray(payload.hackathons) ? payload.hackathons : [];
}

function formatEvent(ev) {
  const title = String(
    (ev && ev.name && (ev.name.text || ev.name.html)) || 'Hackathon Event'
  ).trim();

  const organizer =
    (ev && ev.organizer && ev.organizer.name) ||
    (ev && ev.organizer && ev.organizer.description && ev.organizer.description.text) ||
    'Eventbrite Organizer';

  const location =
    ev && ev.online_event
      ? 'Online'
      : (ev &&
          ev.venue &&
          ev.venue.address &&
          (ev.venue.address.localized_address_display ||
            ev.venue.address.city ||
            ev.venue.address.region)) ||
        'Online';

  const description =
    (ev && ev.description && (ev.description.text || ev.description.html)) || '';

  return {
    title,
    company: String(organizer).trim(),
    slug: slugify(title),
    type: 'hackathon',
    location,
    postedDate: toIsoDate(ev && ev.start && (ev.start.utc || ev.start.local)),
    postedAt: ev && ev.start && (ev.start.utc || ev.start.local) ? new Date(ev.start.utc || ev.start.local).toISOString() : null,
    excerpt: excerptFromDescription(description),
    applyLink: String((ev && ev.url) || '').trim()
  };
}

function parseDevpostStartDate(submissionPeriodDates) {
  const text = String(submissionPeriodDates || '').trim();
  if (!text) return new Date().toISOString().slice(0, 10);

  const yearMatch = text.match(/(\d{4})\s*$/);
  const year = yearMatch ? yearMatch[1] : String(new Date().getUTCFullYear());

  // Example: "Feb 02 - Mar 16, 2026" -> "Feb 02 2026"
  const left = text.split('-')[0].trim();
  const candidate = `${left} ${year}`;
  return toIsoDate(candidate);
}

function formatDevpostEvent(ev) {
  const title = String(ev && ev.title ? ev.title : 'Hackathon Event').trim();
  const organizer = String(ev && ev.organization_name ? ev.organization_name : 'Devpost Organizer').trim();
  const location =
    (ev && ev.displayed_location && ev.displayed_location.location) ||
    'Online';
  const prize = stripHtml((ev && ev.prize_amount) || '');
  const timeLeft = String((ev && ev.time_left_to_submission) || '').trim();
  const excerptParts = [
    `${organizer} hackathon`,
    prize ? `Prize: ${prize}` : '',
    timeLeft ? `Deadline: ${timeLeft}` : ''
  ].filter(Boolean);

  return {
    title,
    company: organizer,
    slug: slugify(`${title}-${ev && ev.id ? ev.id : 'devpost'}`),
    type: 'hackathon',
    location,
    postedDate: parseDevpostStartDate(ev && ev.submission_period_dates),
    postedAt: null,
    excerpt: excerptParts.join(' | '),
    applyLink: String((ev && ev.url) || '').trim()
  };
}

async function main() {
  const existingRaw = fs.readFileSync(HACKATHONS_FILE, 'utf8');
  const existing = JSON.parse(existingRaw);
  if (!Array.isArray(existing)) {
    throw new Error('data/hackathons.json must be an array');
  }

  const usedSlugs = new Set(
    existing.map(item => String(item.slug || '').trim()).filter(Boolean)
  );
  const existingLinks = new Set(
    existing.map(item => String(item.applyLink || '').trim().toLowerCase()).filter(Boolean)
  );
  const maxId = existing.reduce((m, item) => Math.max(m, Number(item.id) || 0), 0);

  const last24hDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let eventbriteEvents = [];
  try {
    eventbriteEvents = await fetchEventbrite('hackathon', last24hDate);
  } catch (err) {
    console.error(`Eventbrite fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  let devpostEvents = [];
  try {
    devpostEvents = await fetchDevpostOpenHackathons();
  } catch (err) {
    console.error(`Devpost fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const formatted = [
    ...eventbriteEvents.map(formatEvent),
    ...devpostEvents.map(formatDevpostEvent)
  ].filter(item => isWithinLast24Hours(item && (item.postedAt || item.postedDate)));

  let nextId = maxId;
  const newItems = [];
  const seenIncoming = new Set();

  for (const item of formatted) {
    if (!item.applyLink) continue;
    const key = item.applyLink.toLowerCase();
    if (existingLinks.has(key) || seenIncoming.has(key)) continue;
    seenIncoming.add(key);

    nextId += 1;
    const slug = uniqueSlug(item.slug, usedSlugs);
    newItems.push({
      id: nextId,
      title: item.title,
      company: item.company,
      slug,
      type: 'hackathon',
      location: item.location || 'Online',
      postedDate: item.postedDate,
      postedAt: item.postedAt || null,
      excerpt: item.excerpt,
      applyLink: item.applyLink
    });
  }

  if (!newItems.length) {
    console.log(
      `No new hackathons found. Sources fetched: Eventbrite=${eventbriteEvents.length}, Devpost=${devpostEvents.length}.`
    );
    return;
  }

  const merged = [...newItems, ...existing];
  fs.writeFileSync(HACKATHONS_FILE, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.log(
    `Added ${newItems.length} hackathons. Sources fetched: Eventbrite=${eventbriteEvents.length}, Devpost=${devpostEvents.length}. Total now: ${merged.length}`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
