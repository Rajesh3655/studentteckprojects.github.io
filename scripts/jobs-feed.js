const DATA_FILES = {
    jobs: '/data/jobs.json',
    internships: '/data/internships.json',
    hackathons: '/data/hackathons.json',
    projects: '/data/projects.json'
};

const TYPE_TO_PATH = {
    job: '/jobs/',
    internship: '/internships/',
    hackathon: '/hackathons/',
    project: '/projects/'
};

const PAGE_TO_TYPE = {
    jobs: 'job',
    internships: 'internship',
    hackathons: 'hackathon',
    projects: 'project'
};
const detailPathCache = new Map();

function getCurrentPage() {
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') return 'home';
    if (path.includes('/internships/')) return 'internships';
    if (path.includes('/hackathons/')) return 'hackathons';
    if (path.includes('/projects/')) return 'projects';
    if (path.includes('/jobs/')) return 'jobs';
    return 'home';
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load ${url}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getDetailPath(item, currentPage) {
    if (currentPage !== 'home') {
        return `/${currentPage}/${item.slug}.html`;
    }
    const base = TYPE_TO_PATH[item.type] || '/jobs/';
    return `${base}${item.slug}.html`;
}

async function pathExists(path) {
    if (detailPathCache.has(path)) return detailPathCache.get(path);

    try {
        let response = await fetch(path, { method: 'HEAD', cache: 'no-store' });
        if (response.status === 405) {
            response = await fetch(path, { method: 'GET', cache: 'no-store' });
        }
        const exists = response.ok;
        detailPathCache.set(path, exists);
        return exists;
    } catch {
        detailPathCache.set(path, false);
        return false;
    }
}

async function resolveDetailPath(item, currentPage) {
    const primaryPath = getDetailPath(item, currentPage);
    const fallbackPath = `/jobs/${item.slug}.html`;

    if (primaryPath === fallbackPath) return primaryPath;
    if (await pathExists(primaryPath)) return primaryPath;
    return fallbackPath;
}

async function displayItems(items, currentPage) {
    const feedContainer = document.getElementById('jobs-feed');
    if (!feedContainer) return;

    let list = items.slice();

    if (currentPage !== 'home') {
        const expectedType = PAGE_TO_TYPE[currentPage];
        list = list.filter(item => item.type === expectedType);
    }

    list.sort((a, b) => new Date(b.postedDate || 0) - new Date(a.postedDate || 0));

    if (currentPage === 'home') {
        list = list.slice(0, 6);
    }

    if (!list.length) {
        feedContainer.innerHTML = '<p class="text-gray-500 col-span-full text-center py-8">No opportunities found. Check back later!</p>';
        return;
    }

    const cards = await Promise.all(list.map(async item => {
        const href = await resolveDetailPath(item, currentPage);
        return `
        <a href="${escapeHtml(href)}" class="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6">
            <h3 class="text-xl font-semibold mb-2">${escapeHtml(item.title || 'Untitled')}</h3>
            <p class="text-gray-600 mb-2">${escapeHtml(item.company || 'Unknown')}</p>
            <p class="text-gray-500 text-sm mb-4">${escapeHtml(item.location || 'Not specified')} • ${escapeHtml(item.postedDate || '')}</p>
            <p class="text-gray-700 mb-4 line-clamp-3">${escapeHtml(item.excerpt || '')}</p>
            <span class="text-blue-600 font-medium">Read More →</span>
        </a>
    `;
    }));

    feedContainer.innerHTML = cards.join('');
}

function fallbackItems(currentPage) {
    const items = {
        jobs: [{
            title: 'Sample Software Engineer Role',
            company: 'Company',
            location: 'Remote',
            postedDate: '2026-02-20',
            excerpt: 'Jobs data is currently unavailable.',
            slug: 'sample-job',
            type: 'job'
        }],
        internships: [{
            title: 'Sample Internship Role',
            company: 'Company',
            location: 'Remote',
            postedDate: '2026-02-20',
            excerpt: 'Internships data is currently unavailable.',
            slug: 'sample-internship',
            type: 'internship'
        }],
        hackathons: [{
            title: 'Sample Hackathon',
            company: 'Organizer',
            location: 'Online',
            postedDate: '2026-02-20',
            excerpt: 'Hackathons data is currently unavailable.',
            slug: 'sample-hackathon',
            type: 'hackathon'
        }],
        projects: [{
            title: 'Sample Project Opportunity',
            company: 'Mentor Org',
            location: 'Remote',
            postedDate: '2026-02-20',
            excerpt: 'Projects data is currently unavailable.',
            slug: 'sample-project',
            type: 'project'
        }]
    };

    if (currentPage === 'home') {
        return [
            ...items.jobs,
            ...items.internships,
            ...items.hackathons,
            ...items.projects
        ];
    }

    return items[currentPage] || [];
}

async function loadFeed() {
    const currentPage = getCurrentPage();

    try {
        let items = [];

        if (currentPage === 'home') {
            const results = await Promise.allSettled([
                fetchJson(DATA_FILES.jobs),
                fetchJson(DATA_FILES.internships),
                fetchJson(DATA_FILES.hackathons),
                fetchJson(DATA_FILES.projects)
            ]);

            items = results
                .filter(result => result.status === 'fulfilled')
                .flatMap(result => result.value);
        } else {
            items = await fetchJson(DATA_FILES[currentPage]);
        }

        await displayItems(items, currentPage);
    } catch (error) {
        console.error('Error loading feed:', error);
        await displayItems(fallbackItems(currentPage), currentPage);
    }
}

document.addEventListener('DOMContentLoaded', loadFeed);
