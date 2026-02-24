import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const HACKATHONS_FILE = path.join(ROOT, 'data', 'hackathons.json');
const EVENTBRITE_API_BASE = 'https://www.eventbriteapi.com/v3/events/search/';
const FETCH_PAGE_SIZE = 50;

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

function excerptFromDescription(value) {
  const clean = stripHtml(value);
  if (!clean) return 'Join this hackathon and apply through the official Eventbrite link.';
  return clean.length > 220 ? `${clean.slice(0, 217)}...` : clean;
}

async function fetchEventbrite(query, rangeStartIso) {
  const token = process.env.EVENTBRITE_API_TOKEN;
  if (!token) {
    throw new Error('Missing EVENTBRITE_API_TOKEN environment variable.');
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
    excerpt: excerptFromDescription(description),
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
  const events = await fetchEventbrite('hackathon', last24hDate);
  const formatted = events.map(formatEvent);

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
      excerpt: item.excerpt,
      applyLink: item.applyLink
    });
  }

  if (!newItems.length) {
    console.log(`No new hackathons found from Eventbrite in the last 24 hours (${events.length} fetched).`);
    return;
  }

  const merged = [...newItems, ...existing];
  fs.writeFileSync(HACKATHONS_FILE, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.log(`Added ${newItems.length} hackathons from Eventbrite. Total now: ${merged.length}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
