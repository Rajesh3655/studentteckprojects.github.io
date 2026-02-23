import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://studenttechprojects.com';
const OUTPUT_FILE = path.join(ROOT, 'sitemap.xml');
const CHANGEFREQ = 'weekly';
const CATEGORY_FILES = {
    jobs: 'jobs.json',
    internships: 'internships.json',
    hackathons: 'hackathons.json',
    projects: 'projects.json'
};

const SKIP_DIRS = new Set([
    '.git',
    '.github',
    'data',
    'images',
    'logo',
    'scripts',
    'templates'
]);

function toPosix(filePath) {
    return filePath.split(path.sep).join('/');
}

function walkHtmlFiles(dir, collected) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(ROOT, fullPath);
        if (entry.isDirectory()) {
            if (!SKIP_DIRS.has(entry.name)) walkHtmlFiles(fullPath, collected);
            continue;
        }
        if (entry.isFile() && /\.html$/i.test(entry.name)) {
            collected.push(relPath);
        }
    }
}

function toCanonicalPath(relPath) {
    const posix = toPosix(relPath);
    if (posix === 'index.html') return '/';
    if (posix.endsWith('/index.html')) return '/' + posix.slice(0, -'index.html'.length);
    return '/' + posix;
}

function priorityFor(urlPath) {
    if (urlPath === '/') return '1.0';
    if (/^\/(jobs|internships|hackathons|projects)\/$/.test(urlPath)) return '0.9';
    if (/^\/(about|contact|privacy-policy|terms-and-conditions|disclaimer)\.html$/.test(urlPath)) return '0.6';
    return '0.8';
}

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function buildSitemap() {
    const htmlFiles = [];
    walkHtmlFiles(ROOT, htmlFiles);

    const staticUrls = htmlFiles
        .map(function (relPath) {
            const fullPath = path.join(ROOT, relPath);
            const stat = fs.statSync(fullPath);
            const urlPath = toCanonicalPath(relPath);
            const loc = SITE_URL + urlPath;
            const lastmod = stat.mtime.toISOString().slice(0, 10);
            return {
                loc: loc,
                lastmod: lastmod,
                changefreq: CHANGEFREQ,
                priority: priorityFor(urlPath)
            };
        })
        .filter(function (item) {
            return item.loc !== `${SITE_URL}/opportunity.html`;
        });

    const detailUrls = Object.entries(CATEGORY_FILES).flatMap(function ([category, fileName]) {
        const dataFile = path.join(ROOT, 'data', fileName);
        if (!fs.existsSync(dataFile)) return [];

        let list = [];
        try {
            const raw = fs.readFileSync(dataFile, 'utf8');
            const parsed = JSON.parse(raw);
            list = Array.isArray(parsed) ? parsed : [];
        } catch (_err) {
            list = [];
        }

        const dataLastmod = fs.statSync(dataFile).mtime.toISOString().slice(0, 10);

        return list
            .filter(function (item) {
                return item && typeof item.slug === 'string' && item.slug.trim().length > 0;
            })
            .map(function (item) {
                const slug = item.slug.trim();
                const contentFile = path.join(ROOT, 'data', 'content', `${slug}.json`);
                const contentLastmod = fs.existsSync(contentFile)
                    ? fs.statSync(contentFile).mtime.toISOString().slice(0, 10)
                    : dataLastmod;
                const loc = `${SITE_URL}/opportunity.html?category=${encodeURIComponent(category)}&slug=${encodeURIComponent(slug)}`;

                return {
                    loc: loc,
                    lastmod: contentLastmod,
                    changefreq: CHANGEFREQ,
                    priority: '0.8'
                };
            });
    });

    const urls = staticUrls
        .concat(detailUrls)
        .filter(function (item, index, arr) {
            return arr.findIndex(function (x) { return x.loc === item.loc; }) === index;
        })
        .sort(function (a, b) {
            return a.loc.localeCompare(b.loc);
        });

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map(function (item) {
            return [
                '  <url>',
                `    <loc>${escapeXml(item.loc)}</loc>`,
                `    <lastmod>${item.lastmod}</lastmod>`,
                `    <changefreq>${item.changefreq}</changefreq>`,
                `    <priority>${item.priority}</priority>`,
                '  </url>'
            ].join('\n');
        }),
        '</urlset>',
        ''
    ].join('\n');

    fs.writeFileSync(OUTPUT_FILE, xml, 'utf8');
    console.log(`Generated sitemap with ${urls.length} URLs -> ${OUTPUT_FILE}`);
}

buildSitemap();
