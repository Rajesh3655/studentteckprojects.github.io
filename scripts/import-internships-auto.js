import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const INTERNSHIPS_FILE = path.join(ROOT, 'data', 'internships.json');
const MAX_NEW_PER_RUN = 25;
const LOOKBACK_HOURS = Number(process.env.IMPORT_LOOKBACK_HOURS || '72');
const LOOKBACK_MS = Math.max(1, LOOKBACK_HOURS) * 60 * 60 * 1000;

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function stripHtml(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toIsoDate(value) {
  const d = new Date(value || Date.now());
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function parseDateValue(value) {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const m = String(value).match(
    /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i
  );
  if (!m) return null;

  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  let hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6] || '0');
  const ampm = m[7].toUpperCase();

  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  const utc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (Number.isNaN(utc.getTime())) return null;
  return utc;
}

function isWithinLookbackHours(dateValue) {
  const dt = parseDateValue(dateValue);
  if (!dt) return false;
  return Date.now() - dt.getTime() <= LOOKBACK_MS;
}

function uniqueSlug(baseSlug, usedSlugs) {
  const base = baseSlug || 'internship-opportunity';
  let slug = base;
  let i = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${i}`;
    i += 1;
  }
  usedSlugs.add(slug);
  return slug;
}

function isInternLike(title, jobTypes) {
  const text = `${String(title || '')} ${String(jobTypes || '')}`;
  return /(intern|internship|trainee|apprentice|graduate program|graduate role|entry level|fresher)/i.test(text);
}

function makeExcerpt(company, title, location, description) {
  const lead = `${company} is offering ${title} internship opportunity in ${location}.`;
  const body = stripHtml(description || '');
  if (!body) return lead;
  const clipped = body.length > 140 ? `${body.slice(0, 137)}...` : body;
  return `${lead} ${clipped}`;
}

async function fetchRemotiveInternships() {
  const url = 'https://remotive.com/api/remote-jobs?search=intern';
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Remotive failed: ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload.jobs) ? payload.jobs : [];
}

async function fetchArbeitnowJobs() {
  const url = 'https://www.arbeitnow.com/api/job-board-api';
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Arbeitnow failed: ${response.status}`);
  const payload = await response.json();
  return Array.isArray(payload.data) ? payload.data : [];
}

function mapRemotiveInternship(item) {
  const title = String(item && item.title ? item.title : '').trim();
  if (!title || !isInternLike(title, item && item.job_type)) return null;
  if (!isWithinLookbackHours(item && item.publication_date)) return null;

  const company = String(item && item.company_name ? item.company_name : 'Not specified').trim();
  const location = String(item && item.candidate_required_location ? item.candidate_required_location : 'Remote').trim();
  const applyLink = String(item && item.url ? item.url : '').trim();
  if (!applyLink) return null;

  return {
    title,
    company,
    location,
    postedDate: toIsoDate(item && item.publication_date),
    excerpt: makeExcerpt(company, title, location, item && item.description),
    applyLink
  };
}

function mapArbeitnowInternship(item) {
  const title = String(item && item.title ? item.title : '').trim();
  const jobTypes = Array.isArray(item && item.job_types) ? item.job_types.join(' ') : '';
  if (!title || !isInternLike(title, jobTypes)) return null;
  if (!isWithinLookbackHours(item && item.created_at)) return null;

  const company = String(item && item.company_name ? item.company_name : 'Not specified').trim();
  const isRemote = Boolean(item && item.remote);
  const locationValue = String(item && item.location ? item.location : '').trim();
  const location = locationValue || (isRemote ? 'Remote' : 'Not specified');
  const applyLink = String(item && item.url ? item.url : '').trim();
  if (!applyLink) return null;

  return {
    title,
    company,
    location,
    postedDate: toIsoDate(item && item.created_at),
    excerpt: makeExcerpt(company, title, location, item && item.description),
    applyLink
  };
}

async function main() {
  const existing = JSON.parse(fs.readFileSync(INTERNSHIPS_FILE, 'utf8'));
  if (!Array.isArray(existing)) throw new Error('data/internships.json must be an array');

  const existingLinks = new Set(
    existing.map(item => String(item.applyLink || '').trim().toLowerCase()).filter(Boolean)
  );
  const usedSlugs = new Set(
    existing.map(item => String(item.slug || '').trim()).filter(Boolean)
  );
  let nextId = existing.reduce((m, item) => Math.max(m, Number(item.id) || 0), 0);

  let remotive = [];
  try {
    remotive = await fetchRemotiveInternships();
  } catch (err) {
    console.error(`Internships source remotive failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  let arbeitnow = [];
  try {
    arbeitnow = await fetchArbeitnowJobs();
  } catch (err) {
    console.error(`Internships source arbeitnow failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const mapped = [
    ...remotive.map(mapRemotiveInternship),
    ...arbeitnow.map(mapArbeitnowInternship)
  ].filter(Boolean);

  const seenIncoming = new Set();
  const toAdd = [];

  for (const item of mapped) {
    const key = item.applyLink.toLowerCase();
    if (existingLinks.has(key) || seenIncoming.has(key)) continue;
    seenIncoming.add(key);

    nextId += 1;
    const slug = uniqueSlug(slugify(`${item.company}-${item.title}-${nextId}`), usedSlugs);
    toAdd.push({
      id: nextId,
      title: item.title,
      company: item.company,
      slug,
      type: 'internship',
      location: item.location || 'Not specified',
      postedDate: item.postedDate || new Date().toISOString().slice(0, 10),
      excerpt: item.excerpt,
      applyLink: item.applyLink
    });

    if (toAdd.length >= MAX_NEW_PER_RUN) break;
  }

  if (!toAdd.length) {
    console.log(
      `No new internships found. Sources fetched: remotive=${remotive.length}, arbeitnow=${arbeitnow.length}. Lookback=${LOOKBACK_HOURS}h.`
    );
    return;
  }

  const merged = [...toAdd, ...existing];
  if (process.env.DRY_RUN === '1') {
    console.log(`DRY_RUN: would add ${toAdd.length} internships. Total would be ${merged.length}.`);
    return;
  }

  fs.writeFileSync(INTERNSHIPS_FILE, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.log(
    `Added ${toAdd.length} internships. Sources fetched: remotive=${remotive.length}, arbeitnow=${arbeitnow.length}. Total now: ${merged.length}`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
