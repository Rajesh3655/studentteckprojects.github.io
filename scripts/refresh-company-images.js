import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const JOBS_FILE = path.join(ROOT, 'data', 'jobs.json');
const OUTPUT_DIR = path.join(ROOT, 'images', 'opportunities');

const COMPANY_DOMAIN_MAP = {
    'state bank of india (sbi)': 'sbi.co.in',
    'reserve bank of india (rbi)': 'rbi.org.in',
    'tata consultancy services (tcs)': 'tcs.com',
    'infosys bpm': 'infosysbpm.com',
    'hindustan petroleum corporation limited (hpcl)': 'hindustanpetroleum.com',
    'forest research institute (icfre)': 'icfre.gov.in',
    'drdo nstl': 'drdo.gov.in',
    'indian bank': 'indianbank.in',
    'tech mahindra': 'techmahindra.com',
    'micro1': 'micro1.ai',
    'firstsource': 'firstsource.com',
    'sutherland': 'sutherlandglobal.com',
    'nec': 'nec.com',
    'flipkart': 'flipkart.com',
    'netflix': 'netflix.com',
    'yantra india limited (yil)': 'yantraindia.co.in'
};

const COMPANY_LOGO_URL_MAP = {
    'state bank of india (sbi)': 'https://upload.wikimedia.org/wikipedia/en/5/58/State_Bank_of_India_logo.svg',
    'reserve bank of india (rbi)': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Reserve_Bank_of_India_logo.svg/500px-Reserve_Bank_of_India_logo.svg.png',
    'yantra india limited (yil)': 'https://www.recruit-gov.com/Yantra2026/template/default/images/yathraindia_new.JPG'
};

function normalizeCompany(value) {
    return String(value || '').trim().toLowerCase();
}

function extractDomainFromUrl(url) {
    try {
        const u = new URL(url);
        return u.hostname.replace(/^www\./i, '');
    } catch {
        return '';
    }
}

function inferDomain(job) {
    const key = normalizeCompany(job.company);
    if (COMPANY_DOMAIN_MAP[key]) return COMPANY_DOMAIN_MAP[key];

    const fromApply = extractDomainFromUrl(job.applyLink || '');
    if (!fromApply) return '';

    if (fromApply.includes('naukri.com')) return '';
    if (fromApply.includes('greenhouse.io')) {
        if (key.includes('prophecy')) return 'prophecy.io';
        if (key.includes('diligent')) return 'diligent.com';
    }
    if (fromApply.includes('ibpsreg.ibps.in')) {
        if (key.includes('state bank of india')) return 'sbi.co.in';
        if (key.includes('reserve bank of india')) return 'rbi.org.in';
    }
    if (fromApply.includes('joinsu') || fromApply.includes('superset')) {
        if (key.includes('cognizant')) return 'cognizant.com';
    }
    if (fromApply.includes('eightfold.ai') && key.includes('zebra')) return 'zebra.com';
    if (fromApply.includes('hirewand.com') && key.includes('sasken')) return 'sasken.com';
    if (fromApply.includes('ultipro.com') && key.includes('milliman')) return 'milliman.com';

    return fromApply;
}

async function fetchLogoBuffer(domain) {
    if (!domain) return null;
    const urls = [
        `https://logo.clearbit.com/${domain}`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
        `https://www.google.com/s2/favicons?domain_url=${domain}&sz=256`
    ];

    for (const url of urls) {
        try {
            const res = await fetch(url, { redirect: 'follow' });
            if (!res.ok) continue;
            const type = (res.headers.get('content-type') || '').toLowerCase();
            if (!type.includes('image')) continue;
            const arr = await res.arrayBuffer();
            const buffer = Buffer.from(arr);
            if (!buffer.length) continue;
            return { buffer, mime: type.includes('png') ? 'image/png' : type.includes('svg') ? 'image/svg+xml' : 'image/png' };
        } catch {
            continue;
        }
    }

    return null;
}

async function fetchDirectLogo(companyName) {
    const key = normalizeCompany(companyName);
    const url = COMPANY_LOGO_URL_MAP[key];
    if (!url) return null;
    try {
        const res = await fetch(url, { redirect: 'follow' });
        if (!res.ok) return null;
        const type = (res.headers.get('content-type') || '').toLowerCase();
        if (!type.includes('image')) return null;
        const arr = await res.arrayBuffer();
        const buffer = Buffer.from(arr);
        if (!buffer.length) return null;
        return {
            buffer,
            mime: type.includes('svg') ? 'image/svg+xml' : type.includes('png') ? 'image/png' : 'image/jpeg'
        };
    } catch {
        return null;
    }
}

function pickLikelyLogoUrl(html, baseUrl) {
    const patterns = [
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
        /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i,
        /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (!match || !match[1]) continue;
        try {
            return new URL(match[1], baseUrl).toString();
        } catch {
            continue;
        }
    }

    return null;
}

async function fetchFromOfficialSite(domain) {
    if (!domain) return null;
    const baseCandidates = [
        `https://${domain}`,
        `https://www.${domain}`
    ];

    for (const base of baseCandidates) {
        try {
            const pageRes = await fetch(base, { redirect: 'follow' });
            if (!pageRes.ok) continue;
            const html = await pageRes.text();
            const assetUrl = pickLikelyLogoUrl(html, pageRes.url || base);
            if (!assetUrl) continue;
            const imgRes = await fetch(assetUrl, { redirect: 'follow' });
            if (!imgRes.ok) continue;
            const type = (imgRes.headers.get('content-type') || '').toLowerCase();
            if (!type.includes('image')) continue;
            const arr = await imgRes.arrayBuffer();
            const buffer = Buffer.from(arr);
            if (!buffer.length) continue;
            return {
                buffer,
                mime: type.includes('svg') ? 'image/svg+xml' : type.includes('png') ? 'image/png' : 'image/png'
            };
        } catch {
            continue;
        }
    }
    return null;
}

function escapeXml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function colorsForCompany(name) {
    const palettes = [
        ['#0b1220', '#1e3a8a'],
        ['#0f172a', '#2563eb'],
        ['#0b3b2e', '#0f766e'],
        ['#3f1d2e', '#be185d'],
        ['#422006', '#ea580c'],
        ['#2d1b69', '#7c3aed']
    ];
    let hash = 0;
    for (const ch of String(name || 'company')) {
        hash = ((hash << 5) - hash) + ch.charCodeAt(0);
        hash |= 0;
    }
    return palettes[Math.abs(hash) % palettes.length];
}

function buildSvg(job, logoData) {
    const [c1, c2] = colorsForCompany(job.company);
    const title = escapeXml(job.title || 'Job Opportunity');
    const company = escapeXml(job.company || 'Company');

    const logoMarkup = logoData
        ? (() => {
            const base64 = logoData.buffer.toString('base64');
            return `<rect x="70" y="70" width="260" height="260" rx="28" fill="#ffffff" fill-opacity="0.98"/>
  <image x="95" y="95" width="210" height="210" preserveAspectRatio="xMidYMid meet" href="data:${logoData.mime};base64,${base64}"/>`;
        })()
        : `<rect x="70" y="70" width="260" height="260" rx="28" fill="#ffffff" fill-opacity="0.96"/>
  <text x="200" y="220" text-anchor="middle" fill="#111827" font-size="58" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${escapeXml((job.company || 'C').trim().charAt(0).toUpperCase())}</text>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${title} at ${company}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  ${logoMarkup}
  <text x="380" y="240" fill="#ffffff" font-size="50" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${title}</text>
  <text x="380" y="315" fill="#dbeafe" font-size="38" font-family="Segoe UI, Arial, sans-serif">${company}</text>
  <text x="380" y="390" fill="#bfdbfe" font-size="26" font-family="Segoe UI, Arial, sans-serif">StudentTechProjects</text>
</svg>
`;
}

export async function refreshCompanyImages(options = {}) {
    const onlySlugs = new Set(
        Array.isArray(options.onlySlugs)
            ? options.onlySlugs.map(s => String(s || '').trim()).filter(Boolean)
            : []
    );
    const jobs = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'))
        .filter(item => item && item.type === 'job')
        .filter(item => !onlySlugs.size || onlySlugs.has(String(item.slug || '').trim()));

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    let withLogo = 0;
    let fallback = 0;

    for (const job of jobs) {
        const domain = inferDomain(job);
        let logo = await fetchDirectLogo(job.company);
        if (!logo) logo = await fetchLogoBuffer(domain);
        if (!logo) logo = await fetchFromOfficialSite(domain);
        const svg = buildSvg(job, logo);
        const out = path.join(OUTPUT_DIR, `${job.slug}.svg`);
        fs.writeFileSync(out, svg, 'utf8');
        if (logo) withLogo += 1;
        else fallback += 1;
        console.log(`${logo ? 'logo' : 'fallback'} | ${job.slug} | ${domain || 'no-domain'}`);
    }

    console.log(`Updated ${jobs.length} images (${withLogo} with logos, ${fallback} fallback)`);
    return { total: jobs.length, withLogo, fallback };
}

async function main() {
    await refreshCompanyImages();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
