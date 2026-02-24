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
const PROJECT_PROFILES = [
    {
        domain: 'Healthcare AI',
        difficulty: 'Advanced',
        duration: '10-14 weeks',
        teamSize: '3-5 members',
        keywords: {
            disease: 3, cancer: 3, diabetes: 3, arthritis: 3, osteoporosis: 3, melanoma: 3, pneumonia: 3, glaucoma: 3,
            retinopathy: 3, mri: 2, xray: 2, ct: 2, ecg: 2, clinical: 2, hospital: 2, medical: 2
        }
    },
    {
        domain: 'Computer Vision',
        difficulty: 'Advanced',
        duration: '10-14 weeks',
        teamSize: '3-5 members',
        keywords: {
            cnn: 3, image: 2, object: 2, detection: 2, segmentation: 2, yolo: 3, mask: 2, recognition: 2,
            superresolution: 3, inpainting: 3, denoising: 3, video: 2, face: 2
        }
    },
    {
        domain: 'NLP',
        difficulty: 'Intermediate',
        duration: '8-12 weeks',
        teamSize: '2-4 members',
        keywords: {
            nlp: 3, sentiment: 3, text: 2, translation: 3, summarization: 3, chatbot: 3, speech: 2, transformer: 3,
            bert: 3, gpt: 3, fake: 2, news: 2, hate: 2, cyberbullying: 2
        }
    },
    {
        domain: 'Cybersecurity & Risk',
        difficulty: 'Intermediate',
        duration: '8-12 weeks',
        teamSize: '2-4 members',
        keywords: {
            phishing: 3, fraud: 3, malicious: 3, malware: 3, intrusion: 3, threat: 2, cybersecurity: 3,
            attack: 2, network: 2, spam: 2, scam: 2, deepfake: 2
        }
    },
    {
        domain: 'Financial Analytics',
        difficulty: 'Intermediate',
        duration: '8-12 weeks',
        teamSize: '2-3 members',
        keywords: {
            stock: 3, market: 2, crypto: 3, credit: 2, loan: 2, price: 2, volatility: 2, insurance: 2, claims: 2
        }
    },
    {
        domain: 'Time Series Forecasting',
        difficulty: 'Intermediate',
        duration: '8-12 weeks',
        teamSize: '2-4 members',
        keywords: {
            forecast: 3, forecasting: 3, arima: 3, lstm: 3, timeseries: 3, prediction: 2, demand: 2, traffic: 2,
            rainfall: 2, weather: 2, energy: 2, sales: 2
        }
    },
    {
        domain: 'AgriTech Analytics',
        difficulty: 'Intermediate',
        duration: '8-12 weeks',
        teamSize: '2-4 members',
        keywords: {
            crop: 3, agriculture: 3, plant: 3, yield: 3, soil: 2, irrigation: 2, farming: 2, leaf: 2
        }
    },
    {
        domain: 'Recommender Systems',
        difficulty: 'Intermediate',
        duration: '8-12 weeks',
        teamSize: '2-4 members',
        keywords: {
            recommendation: 3, recommender: 3, collaborative: 3, filtering: 3, personalized: 2, user: 1
        }
    },
    {
        domain: 'Cloud & Systems',
        difficulty: 'Intermediate',
        duration: '8-12 weeks',
        teamSize: '2-4 members',
        keywords: {
            cloud: 3, iot: 2, smartgrid: 2, distributed: 2, resource: 2, optimization: 2, scheduling: 2
        }
    }
];

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

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function generatedExcerpt(item) {
    const title = String(item && item.title ? item.title : 'Opportunity').trim();
    const company = String(item && item.company ? item.company : 'the organization').trim();
    const type = String(item && item.type ? item.type : '').toLowerCase();

    if (type === 'project') {
        const inferred = inferProjectSignals(item);
        return `${title} is a ${inferred.domain.toLowerCase()} college project from ${company} with ${inferred.difficulty.toLowerCase()} complexity and practical implementation scope.`;
    }

    if (type === 'hackathon') {
        return `${company} is organizing ${title}. Review eligibility, prepare your team, and submit before the deadline.`;
    }

    if (type === 'internship') {
        return `${company} is offering ${title}. Check eligibility, required skills, and apply through the official process.`;
    }

    return `${company} is hiring for ${title}. Check role details, eligibility, and application steps on the detail page.`;
}

function inferProjectSignals(item) {
    const title = normalizeText(item && item.title ? item.title : '');
    const excerpt = normalizeText(item && item.excerpt ? item.excerpt : '');
    const text = `${title} ${excerpt}`;

    let bestProfile = null;
    let bestScore = 0;

    for (const profile of PROJECT_PROFILES) {
        let score = 0;
        for (const [keyword, weight] of Object.entries(profile.keywords)) {
            if (text.includes(keyword)) score += weight;
        }
        if (score > bestScore) {
            bestScore = score;
            bestProfile = profile;
        }
    }

    if (bestProfile && bestScore > 0) {
        const advancedBoost = /(transformer|gan|federated|real time|optimization|multi stream|hybrid)/.test(text);
        return {
            domain: bestProfile.domain,
            difficulty: advancedBoost ? 'Advanced' : bestProfile.difficulty,
            duration: advancedBoost ? '10-14 weeks' : bestProfile.duration,
            teamSize: advancedBoost ? '3-5 members' : bestProfile.teamSize
        };
    }

    return {
        domain: 'Applied Machine Learning',
        difficulty: 'Intermediate',
        duration: '8-12 weeks',
        teamSize: '2-4 members'
    };
}

function matchesSearch(item, query) {
    if (!query) return true;
    const haystack = normalizeText([
        item.title,
        item.company,
        item.location,
        item.excerpt,
        item.type,
        item.experience,
        item.domain,
        item.duration,
        item.difficulty,
        item.teamSize,
        item.postedDate
    ].join(' '));
    return haystack.includes(query);
}

function ensureSearchUi(currentPage, onChange) {
    const feed = document.getElementById('jobs-feed');
    if (!feed) return null;

    const parent = feed.parentElement;
    if (!parent) return null;

    const existing = document.getElementById('feed-search');
    if (existing) return existing;

    const wrapper = document.createElement('div');
    wrapper.className = 'mb-6';
    wrapper.innerHTML = `
        <label for="feed-search" class="block text-sm font-medium text-gray-700 mb-2">Search opportunities</label>
        <div class="relative">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input id="feed-search" type="text" placeholder="Search by title, company, skill, domain, location..."
                class="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <p id="feed-search-count" class="text-sm text-gray-500 mt-2"></p>
    `;

    if (currentPage === 'home') {
        const allSection = feed.closest('section');
        if (allSection) {
            allSection.insertBefore(wrapper, feed);
        } else {
            parent.insertBefore(wrapper, feed);
        }
    } else {
        parent.insertBefore(wrapper, feed);
    }

    const input = wrapper.querySelector('#feed-search');
    if (input) {
        input.addEventListener('input', () => onChange(input.value || ''));
    }
    return input;
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
    return items.slice().sort((a, b) => {
        const bDate = new Date(b.postedAt || b.postedDate || 0).getTime();
        const aDate = new Date(a.postedAt || a.postedDate || 0).getTime();
        if (bDate !== aDate) return bDate - aDate;
        const bId = Number(b.id) || 0;
        const aId = Number(a.id) || 0;
        return bId - aId;
    });
}

async function buildCards(list, currentPage, latestJobDate) {
    return await Promise.all(list.map(async item => {
        const href = await resolveDetailPath(item, currentPage);
        const isProject = item && item.type === 'project';
        const projectSignals = isProject ? inferProjectSignals(item) : null;
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
                <span class="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">${escapeHtml(item.domain || projectSignals.domain)}</span>
                <span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">${escapeHtml(item.duration || projectSignals.duration)}</span>
                <span class="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">${escapeHtml(item.difficulty || projectSignals.difficulty)}</span>
                <span class="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">${escapeHtml(item.teamSize || projectSignals.teamSize)}</span>
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
            <p class="text-gray-700 mb-4 line-clamp-3">${escapeHtml(item.excerpt || generatedExcerpt(item))}</p>
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
            renderSection('jobs-feed-projects', projects.slice(0, HOME_SECTION_LIMIT), currentPage, latestJobDate),
            renderSection('jobs-feed-internships', internships.slice(0, HOME_SECTION_LIMIT), currentPage, latestJobDate),
            renderSection('jobs-feed-hackathons', hackathons.slice(0, HOME_SECTION_LIMIT), currentPage, latestJobDate)
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
    let items = [];

    const searchInput = ensureSearchUi(currentPage, async (value) => {
        const q = normalizeText(value);
        const filtered = q ? items.filter(item => matchesSearch(item, q)) : items;
        const countEl = document.getElementById('feed-search-count');
        if (countEl) countEl.textContent = `${filtered.length} result${filtered.length === 1 ? '' : 's'}`;
        await displayItems(filtered, currentPage);
    });

    try {
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

        if (searchInput) {
            const countEl = document.getElementById('feed-search-count');
            if (countEl) countEl.textContent = `${items.length} result${items.length === 1 ? '' : 's'}`;
        }

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
        items = fallbackItems(currentPage);
        if (searchInput) {
            const countEl = document.getElementById('feed-search-count');
            if (countEl) countEl.textContent = `${items.length} result${items.length === 1 ? '' : 's'}`;
        }
        await displayItems(items, currentPage);
    }
}

document.addEventListener('DOMContentLoaded', loadFeed);
