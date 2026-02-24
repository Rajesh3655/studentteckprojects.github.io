import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const JOBS_FILE = path.join(ROOT, 'data', 'jobs.json');
const MAX_NEW_PER_RUN = 30;

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

function makeExcerpt(company, title, location, description) {
  const lead = `${company} is hiring for ${title} role in ${location}.`;
  const body = stripHtml(description || '');
  if (!body) return lead;
  const clipped = body.length > 140 ? `${body.slice(0, 137)}...` : body;
  return `${lead} ${clipped}`;
}

function uniqueSlug(baseSlug, usedSlugs) {
  const base = baseSlug || 'job-opportunity';
  let slug = base;
  let i = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${i}`;
    i += 1;
  }
  usedSlugs.add(slug);
  return slug;
}

function isInternLike(title) {
  return /(intern|internship|trainee|apprentice)/i.test(String(title || ''));
}

async function fetchRemotiveJobs() {
  const url = 'https://remotive.com/api/remote-jobs';
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

function mapRemotiveJob(item) {
  const title = String(item && item.title ? item.title : '').trim();
  if (!title || isInternLike(title)) return null;

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
    applyLink,
    salary: String(item && item.salary ? stripHtml(item.salary) : '').trim() || 'Not specified'
  };
}

function mapArbeitnowJob(item) {
  const title = String(item && item.title ? item.title : '').trim();
  if (!title || isInternLike(title)) return null;

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
    applyLink,
    salary: 'Not specified'
  };
}

async function main() {
  const existing = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
  if (!Array.isArray(existing)) throw new Error('data/jobs.json must be an array');

  const existingLinks = new Set(
    existing.map(item => String(item.applyLink || '').trim().toLowerCase()).filter(Boolean)
  );
  const usedSlugs = new Set(
    existing.map(item => String(item.slug || '').trim()).filter(Boolean)
  );
  let nextId = existing.reduce((m, item) => Math.max(m, Number(item.id) || 0), 0);

  let remotive = [];
  try {
    remotive = await fetchRemotiveJobs();
  } catch (err) {
    console.error(`Jobs source remotive failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  let arbeitnow = [];
  try {
    arbeitnow = await fetchArbeitnowJobs();
  } catch (err) {
    console.error(`Jobs source arbeitnow failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const mapped = [
    ...remotive.map(mapRemotiveJob),
    ...arbeitnow.map(mapArbeitnowJob)
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
      type: 'job',
      location: item.location || 'Not specified',
      postedDate: item.postedDate || new Date().toISOString().slice(0, 10),
      excerpt: item.excerpt,
      applyLink: item.applyLink,
      qualification: 'Not specified',
      experience: 'As per role',
      salary: item.salary || 'Not specified',
      batch: 'Not specified',
      url: `/jobs/${slug}.html`
    });

    if (toAdd.length >= MAX_NEW_PER_RUN) break;
  }

  if (!toAdd.length) {
    console.log(
      `No new jobs found. Sources fetched: remotive=${remotive.length}, arbeitnow=${arbeitnow.length}.`
    );
    return;
  }

  const merged = [...toAdd, ...existing];
  if (process.env.DRY_RUN === '1') {
    console.log(`DRY_RUN: would add ${toAdd.length} jobs. Total would be ${merged.length}.`);
    return;
  }

  fs.writeFileSync(JOBS_FILE, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.log(
    `Added ${toAdd.length} jobs. Sources fetched: remotive=${remotive.length}, arbeitnow=${arbeitnow.length}. Total now: ${merged.length}`
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
