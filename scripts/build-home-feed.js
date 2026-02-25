import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const LIMIT_PER_CATEGORY = 9;
const INPUTS = {
  jobs: path.join(ROOT, 'data', 'jobs.json'),
  internships: path.join(ROOT, 'data', 'internships.json'),
  hackathons: path.join(ROOT, 'data', 'hackathons.json'),
  projects: path.join(ROOT, 'data', 'projects.json')
};
const OUTPUT = path.join(ROOT, 'data', 'home-feed.json');

function readArray(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sortByPostedDateDesc(items) {
  return items.slice().sort((a, b) => {
    const bDate = new Date(b.postedAt || b.postedDate || 0).getTime();
    const aDate = new Date(a.postedAt || a.postedDate || 0).getTime();
    if (bDate !== aDate) return bDate - aDate;
    const bId = Number(b.id) || 0;
    const aId = Number(a.id) || 0;
    return bId - aId;
  });
}

function pickFields(item) {
  return {
    title: item.title || '',
    company: item.company || '',
    slug: item.slug || '',
    type: item.type || '',
    location: item.location || 'Not specified',
    postedDate: item.postedDate || '',
    postedAt: item.postedAt || null,
    excerpt: item.excerpt || '',
    experience: item.experience || 'Not specified',
    domain: item.domain || '',
    duration: item.duration || '',
    difficulty: item.difficulty || '',
    teamSize: item.teamSize || ''
  };
}

function buildCategory(items) {
  return sortByPostedDateDesc(items).slice(0, LIMIT_PER_CATEGORY).map(pickFields);
}

function latestTimestamp(items) {
  let latest = 0;
  for (const item of items) {
    const ts = new Date(item.postedAt || item.postedDate || 0).getTime();
    if (Number.isFinite(ts) && ts > latest) latest = ts;
  }
  return latest;
}

function main() {
  const jobs = readArray(INPUTS.jobs).filter(x => x && x.type === 'job');
  const internships = readArray(INPUTS.internships).filter(x => x && x.type === 'internship');
  const hackathons = readArray(INPUTS.hackathons).filter(x => x && x.type === 'hackathon');
  const projects = readArray(INPUTS.projects).filter(x => x && x.type === 'project');
  const allItems = [...jobs, ...internships, ...hackathons, ...projects];
  const latest = latestTimestamp(allItems);

  const payload = {
    updatedAt: latest ? new Date(latest).toISOString() : null,
    counts: {
      jobs: jobs.length,
      internships: internships.length,
      hackathons: hackathons.length,
      projects: projects.length
    },
    latest: {
      jobs: buildCategory(jobs),
      internships: buildCategory(internships),
      hackathons: buildCategory(hackathons),
      projects: buildCategory(projects)
    }
  };

  fs.writeFileSync(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${OUTPUT}`);
}

main();
