import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const TEMPLATE_PATH = path.join(ROOT, 'templates', 'content-display-template.html');
const DATA_DIR = path.join(ROOT, 'data');

const CATEGORY_FILES = {
    jobs: 'jobs.json',
    internships: 'internships.json',
    hackathons: 'hackathons.json',
    projects: 'projects.json'
};

function readJson(filePath, fallback = []) {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function withCanonical(templateHtml, canonicalPath) {
    const absolute = `https://studenttechprojects.com${canonicalPath}`;
    return templateHtml
        .replace(/<link id="canonical-link" rel="canonical" href="[^"]*">/i, `<link id="canonical-link" rel="canonical" href="${absolute}">`)
        .replace(/<meta property="og:url" content="[^"]*">/i, `<meta property="og:url" content="${absolute}">`);
}

function buildPages() {
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    let total = 0;

    Object.entries(CATEGORY_FILES).forEach(([category, fileName]) => {
        const list = readJson(path.join(DATA_DIR, fileName), []);
        const outDir = path.join(ROOT, category);
        ensureDir(outDir);

        const expected = new Set(['index.html']);
        list.forEach((item) => {
            if (!item || typeof item.slug !== 'string' || !item.slug.trim()) return;
            const slug = item.slug.trim();
            expected.add(`${slug}.html`);
            const outFile = path.join(outDir, `${slug}.html`);
            const canonicalPath = `/${category}/${slug}.html`;
            fs.writeFileSync(outFile, withCanonical(template, canonicalPath), 'utf8');
            total += 1;
        });

        // Remove stale generated files that are no longer present in JSON data.
        fs.readdirSync(outDir, { withFileTypes: true })
            .filter((entry) => entry.isFile() && /\.html$/i.test(entry.name))
            .forEach((entry) => {
                if (!expected.has(entry.name)) {
                    fs.unlinkSync(path.join(outDir, entry.name));
                }
            });
    });

    console.log(`Generated ${total} detail HTML files from JSON.`);
}

buildPages();

