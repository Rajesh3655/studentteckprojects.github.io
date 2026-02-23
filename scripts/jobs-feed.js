const DATA_FILES = {
    jobs: '/data/jobs.json',
    internships: '/data/internships.json',
    hackathons: '/data/hackathons.json',
    projects: '/data/projects.json'
};

const TYPE_TO_CATEGORY = {
    job: 'jobs',
    internship: 'internships',
    hackathon: 'hackathons',
    project: 'projects'
};

const PAGE_TO_TYPE = {
    jobs: 'job',
    internships: 'internship',
    hackathons: 'hackathon',
    projects: 'project'
};
const HOME_SECTION_LIMIT = 9;

function updateCategoryCounts(counts) {
    function setCardCount(categoryKey, countValue) {
        const idEl = document.getElementById(`count-${categoryKey}`);
        if (idEl) {
            idEl.textContent = String(countValue || 0);
            return;
        }

        const hrefMap = {
            jobs: '/jobs/',
            internships: '/internships/',
            hackathons: '/hackathons/',
            projects: '/projects/'
        };

        const card = document.querySelector(`main section.grid a[href="${hrefMap[categoryKey]}"]`);
        if (!card) return;

        let countLine = card.querySelector(`[data-count-category="${categoryKey}"]`);
        if (!countLine) {
            countLine = document.createElement('p');
            countLine.className = 'text-sm text-gray-500 mt-2';
            countLine.setAttribute('data-count-category', categoryKey);
            card.appendChild(countLine);
        }

        countLine.textContent = `${String(countValue || 0)} total`;
    }

    const jobsEl = document.getElementById('count-jobs');
    const internshipsEl = document.getElementById('count-internships');
    const hackathonsEl = document.getElementById('count-hackathons');
    const projectsEl = document.getElementById('count-projects');

    if (jobsEl) jobsEl.textContent = String(counts.jobs || 0);
    if (internshipsEl) internshipsEl.textContent = String(counts.internships || 0);
    if (hackathonsEl) hackathonsEl.textContent = String(counts.hackathons || 0);
    if (projectsEl) projectsEl.textContent = String(counts.projects || 0);

    setCardCount('jobs', counts.jobs || 0);
    setCardCount('internships', counts.internships || 0);
    setCardCount('hackathons', counts.hackathons || 0);
    setCardCount('projects', counts.projects || 0);
}

function getCurrentPage() {
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') return 'home';
    if (path.includes('/opportunities/')) return 'opportunities';
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
    const pageCategory = PAGE_TO_TYPE[currentPage] ? currentPage : null;
    const category = pageCategory || TYPE_TO_CATEGORY[item.type] || 'jobs';
    return `/opportunity.html?category=${encodeURIComponent(category)}&slug=${encodeURIComponent(item.slug || '')}`;
}

async function resolveDetailPath(item, currentPage) {
    return getDetailPath(item, currentPage);
}

function sortByPostedDateDesc(items) {
    return items.slice().sort((a, b) => new Date(b.postedDate || 0) - new Date(a.postedDate || 0));
}

async function buildCards(list, currentPage, latestJobDate) {
    return await Promise.all(list.map(async item => {
        const href = await resolveDetailPath(item, currentPage);
        const isProject = item && item.type === 'project';
        const isLatestJob = currentPage === 'home'
            && item.type === 'job'
            && latestJobDate
            && item.postedDate === latestJobDate;
        const newBadge = isLatestJob
            ? '<span class="absolute top-4 right-4 text-[11px] font-bold tracking-wide px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">NEW</span>'
            : '';
        const hasExperience = item && item.experience && !/^not specified$/i.test(String(item.experience).trim());
        const experienceLine = hasExperience
            ? `<p class="text-gray-500 text-sm mb-2">Experience: ${escapeHtml(item.experience)}</p>`
            : '';
        const projectMeta = isProject
            ? `
            <div class="flex flex-wrap gap-2 mb-3">
                <span class="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">Project</span>
                <span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">${escapeHtml(item.duration || '8-12 weeks')}</span>
                <span class="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">${escapeHtml(item.difficulty || 'Intermediate')}</span>
                <span class="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">${escapeHtml(item.teamSize || '2-4 members')}</span>
            </div>
            `
            : '';
        const ctaLabel = isProject ? 'View Details' : 'View Details & Apply';
        const cta = `
            <div class="mt-auto pt-4 flex justify-center">
                <a href="${escapeHtml(href)}" class="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium">${ctaLabel}</a>
            </div>`;
        return `
        <article class="relative bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 flex flex-col h-full">
            ${newBadge}
            <h3 class="text-xl font-semibold mb-2">
                <a href="${escapeHtml(href)}" class="hover:text-blue-700">${escapeHtml(item.title || 'Untitled')}</a>
            </h3>
            <p class="text-gray-600 mb-2">${escapeHtml(item.company || 'Unknown')}</p>
            <p class="text-gray-500 text-sm mb-4">${escapeHtml(item.location || 'Not specified')} • ${escapeHtml(item.postedDate || '')}</p>
            ${projectMeta}
            ${experienceLine}
            <p class="text-gray-700 mb-4 line-clamp-3">${escapeHtml(item.excerpt || '')}</p>
            ${cta}
        </article>
    `;
    }));
}

async function renderSection(containerId, list, currentPage, latestJobDate) {
    const feedContainer = document.getElementById(containerId);
    if (!feedContainer) return;

    if (!list.length) {
        feedContainer.innerHTML = '<p class="text-gray-500 col-span-full text-center py-8">No opportunities found. Check back later!</p>';
        return;
    }

    const cards = await buildCards(list, currentPage, latestJobDate);
    feedContainer.innerHTML = cards.join('');
}

async function displayItems(items, currentPage) {
    if (currentPage === 'home') {
        const jobs = sortByPostedDateDesc(items.filter(item => item.type === 'job'));
        const internships = sortByPostedDateDesc(items.filter(item => item.type === 'internship'));
        const hackathons = sortByPostedDateDesc(items.filter(item => item.type === 'hackathon'));
        const projects = sortByPostedDateDesc(items.filter(item => item.type === 'project'));
        const all = sortByPostedDateDesc(items);
        const latestJobDate = jobs.length ? jobs[0].postedDate : null;

        await Promise.all([
            renderSection('jobs-feed', all.slice(0, HOME_SECTION_LIMIT), currentPage, latestJobDate),
            renderSection('jobs-feed-jobs', jobs.slice(0, HOME_SECTION_LIMIT), currentPage, latestJobDate),
            renderSection('jobs-feed-internships', internships.slice(0, HOME_SECTION_LIMIT), currentPage, latestJobDate),
            renderSection('jobs-feed-hackathons', hackathons.slice(0, HOME_SECTION_LIMIT), currentPage, latestJobDate),
            renderSection('jobs-feed-projects', projects.slice(0, HOME_SECTION_LIMIT), currentPage, latestJobDate)
        ]);
        return;
    }

    if (currentPage === 'opportunities') {
        const all = sortByPostedDateDesc(items);
        await renderSection('jobs-feed', all, currentPage, null);
        return;
    }

    const expectedType = PAGE_TO_TYPE[currentPage];
    const list = sortByPostedDateDesc(items.filter(item => item.type === expectedType));
    await renderSection('jobs-feed', list, currentPage, null);
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
        let categoryCounts = null;

        if (currentPage === 'home' || currentPage === 'opportunities') {
            const results = await Promise.allSettled([
                fetchJson(DATA_FILES.jobs),
                fetchJson(DATA_FILES.internships),
                fetchJson(DATA_FILES.hackathons),
                fetchJson(DATA_FILES.projects)
            ]);

            const jobsData = results[0].status === 'fulfilled' ? results[0].value : [];
            const internshipsData = results[1].status === 'fulfilled' ? results[1].value : [];
            const hackathonsData = results[2].status === 'fulfilled' ? results[2].value : [];
            const projectsData = results[3].status === 'fulfilled' ? results[3].value : [];

            categoryCounts = {
                jobs: jobsData.length,
                internships: internshipsData.length,
                hackathons: hackathonsData.length,
                projects: projectsData.length
            };

            items = [
                ...jobsData,
                ...internshipsData,
                ...hackathonsData,
                ...projectsData
            ];
        } else {
            items = await fetchJson(DATA_FILES[currentPage]);
        }

        if (categoryCounts && currentPage === 'home') updateCategoryCounts(categoryCounts);
        await displayItems(items, currentPage);
    } catch (error) {
        console.warn('Feed fallback activated:', error && error.message ? error.message : error);
        if (currentPage === 'home') {
            updateCategoryCounts({
                jobs: 0,
                internships: 0,
                hackathons: 0,
                projects: 0
            });
        }
        await displayItems(fallbackItems(currentPage), currentPage);
    }
}

document.addEventListener('DOMContentLoaded', loadFeed);
