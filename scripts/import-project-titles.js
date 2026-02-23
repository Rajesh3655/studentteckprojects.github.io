import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const PROJECTS_FILE = path.join(ROOT, 'data', 'projects.json');
const TITLES_FILE = path.join(ROOT, 'data', 'project_titles.txt');

function readJson(filePath, fallback = []) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function makeExcerpt(title) {
  return `${title} is a college student project title with practical implementation, module-wise execution, and portfolio-ready outcomes.`;
}

function uniqueSlug(base, used) {
  let slug = base || 'college-student-project';
  let index = 2;
  while (used.has(slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }
  used.add(slug);
  return slug;
}

function main() {
  if (!fs.existsSync(TITLES_FILE)) {
    console.error(`Missing input file: ${TITLES_FILE}`);
    process.exit(1);
  }

  const existing = readJson(PROJECTS_FILE, []);
  const existingTitleSet = new Set(
    existing.map((item) => String(item.title || '').trim().toLowerCase()).filter(Boolean)
  );
  const usedSlugs = new Set(existing.map((item) => String(item.slug || '').trim()).filter(Boolean));

  const rawLines = fs.readFileSync(TITLES_FILE, 'utf8').split(/\r?\n/);
  const titles = rawLines
    .map((line) => line.trim())
    .filter(Boolean);

  let nextId =
    existing.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
  const today = new Date().toISOString().slice(0, 10);
  const added = [];

  for (const title of titles) {
    const key = title.toLowerCase();
    if (existingTitleSet.has(key)) continue;

    const baseSlug = slugify(title);
    const slug = uniqueSlug(baseSlug, usedSlugs);

    added.push({
      id: nextId++,
      title,
      company: 'College Student Projects',
      slug,
      type: 'project',
      location: 'Remote',
      postedDate: today,
      excerpt: makeExcerpt(title),
      applyLink: ''
    });

    existingTitleSet.add(key);
  }

  const merged = existing.concat(added);
  fs.writeFileSync(PROJECTS_FILE, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

  console.log(`Imported ${added.length} new project titles (from ${titles.length} lines).`);
  console.log(`Total projects: ${merged.length}`);
}

main();

