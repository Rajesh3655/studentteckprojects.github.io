// Dynamic detail page renderer
(function () {
    const DATA_FILES = {
        jobs: '/data/jobs.json',
        internships: '/data/internships.json',
        hackathons: '/data/hackathons.json',
        projects: '/data/projects.json'
    };

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function fileSlugFromPath() {
        const parts = window.location.pathname.split('/').filter(Boolean);
        const file = parts[parts.length - 1] || '';
        return file.replace(/\.html$/i, '');
    }

    function categoryFromPath() {
        const parts = window.location.pathname.split('/').filter(Boolean);
        const first = parts[0] || 'jobs';
        if (DATA_FILES[first]) return first;
        return 'jobs';
    }

    function pageLabel(category) {
        return category.charAt(0).toUpperCase() + category.slice(1);
    }

    function defaultImagePath(category) {
        return `/images/opportunities/${category}-default.svg`;
    }

    function normalizedPathname() {
        const path = window.location.pathname || '/';
        return path.endsWith('/') ? path : path;
    }

    async function fetchJson(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load ' + url);
        return await res.json();
    }

    function setMeta(name, content) {
        let el = document.querySelector(`meta[name="${name}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute('name', name);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    }

    function setOg(property, content) {
        let el = document.querySelector(`meta[property="${property}"]`);
        if (!el) {
            el = document.createElement('meta');
            el.setAttribute('property', property);
            document.head.appendChild(el);
        }
        el.setAttribute('content', content);
    }

    function listHtml(items, fallback) {
        const list = Array.isArray(items) ? items.filter(Boolean) : [];
        if (!list.length) return `<li>${escapeHtml(fallback)}</li>`;
        return list.map(item => `<li>${escapeHtml(item)}</li>`).join('');
    }

    function paragraphHtml(value, fallback) {
        const text = String(value || '').trim();
        return escapeHtml(text || fallback);
    }

    function fmtDate(value) {
        if (!value) return 'Not specified';
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function toIsoDate(value) {
        const text = String(value || '').trim();
        if (!text || /^(asap|tbd|n\/a|na|not specified)$/i.test(text)) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
        const d = new Date(text);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 10);
    }

    function parseBaseSalary(value) {
        const text = String(value || '').trim();
        if (!text) return null;

        const amountMatch = text.match(/(\d+(?:\.\d+)?)(?:\s*[-to]+\s*(\d+(?:\.\d+)?))?/i);
        if (!amountMatch) return null;

        const currency = /₹|inr/i.test(text) ? 'INR' : /\$/i.test(text) ? 'USD' : null;
        if (!currency) return null;

        const minRaw = Number(amountMatch[1]);
        const maxRaw = Number(amountMatch[2] || amountMatch[1]);
        if (!Number.isFinite(minRaw) || !Number.isFinite(maxRaw)) return null;

        let multiplier = 1;
        if (/lakh|lakhs|lac|lpa/i.test(text)) multiplier = 100000;
        if (/crore|crores|cr/i.test(text)) multiplier = 10000000;
        if (/k\b/i.test(text)) multiplier = 1000;

        return {
            '@type': 'MonetaryAmount',
            currency: currency,
            value: {
                '@type': 'QuantitativeValue',
                minValue: Math.round(Math.min(minRaw, maxRaw) * multiplier),
                maxValue: Math.round(Math.max(minRaw, maxRaw) * multiplier),
                unitText: /month/i.test(text) ? 'MONTH' : 'YEAR'
            }
        };
    }

    function parseLocation(value) {
        const text = String(value || '').trim();
        if (!text) return { remote: false, locality: null, region: null, country: 'IN' };
        const remote = /remote/i.test(text);
        const parts = text.split(',').map(function (v) { return v.trim(); }).filter(Boolean);
        return {
            remote: remote,
            locality: parts[0] || text,
            region: parts.length > 1 ? parts[1] : null,
            country: /india|in\b/i.test(text) ? 'IN' : 'IN'
        };
    }

    async function render() {
        const slug = fileSlugFromPath();
        const category = categoryFromPath();
        const pageData = await fetchJson(DATA_FILES[category]);
        const list = Array.isArray(pageData) ? pageData : [];
        const base = list.find(item => item.slug === slug);

        if (!base) {
            document.getElementById('content-root').innerHTML = '<p class="text-center text-red-600">Content not found for this page.</p>';
            return;
        }

        let details = {};
        try {
            details = await fetchJson(`/data/content/${slug}.json`);
        } catch (_err) {
            details = {};
        }

        const data = Object.assign({}, base, details);
        const pageTitle = `${data.title} | StudentTechProjects`;
        const description = data.excerpt || data.intro || `${data.title} opportunity for students.`;
        const canonical = `https://studenttechprojects.com${normalizedPathname()}`;
        const imagePath = data.image || `/images/opportunities/${slug}.svg`;
        const imageAlt = data.imageAlt || `${data.title || 'Opportunity'} - ${data.company || 'StudentTechProjects'}`;
        const imageAbsolute = `https://studenttechprojects.com${imagePath}`;

        document.title = pageTitle;
        setMeta('description', description);
        setOg('og:title', data.title || 'Opportunity');
        setOg('og:description', description);
        setOg('og:url', canonical);
        setOg('og:image', imageAbsolute);
        setMeta('twitter:card', 'summary_large_image');
        setMeta('twitter:title', data.title || 'Opportunity');
        setMeta('twitter:description', description);
        setMeta('twitter:image', imageAbsolute);

        const canonicalEl = document.getElementById('canonical-link');
        if (canonicalEl) canonicalEl.href = canonical;

        document.getElementById('crumb-category').textContent = pageLabel(category);
        document.getElementById('crumb-category').href = `/${category}/`;
        document.getElementById('crumb-title').textContent = data.title || 'Opportunity';

        const applyBtn = data.applyLink
            ? `<a href="${escapeHtml(data.applyLink)}" target="_blank" rel="noopener noreferrer" class="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition">Apply Now</a>`
            : '';

        const timelineItems = [
            `Posted on: ${fmtDate(data.postedDate)}`,
            `Last date: ${data.lastDate || 'Not specified'}`,
            'Shortlisting and next steps are communicated by the organizer/company.'
        ];

        const tips = Array.isArray(data.tips) && data.tips.length ? data.tips : [
            'Keep your resume updated and tailored to this role.',
            'Highlight relevant projects, internships, or hackathon work.',
            'Review core technical topics and practice problem-solving before assessments.'
        ];

        const faq = Array.isArray(data.faq) && data.faq.length ? data.faq : [
            { q: 'Who can apply for this opportunity?', a: `Candidates meeting the listed qualifications and eligibility criteria can apply.` },
            { q: 'Is this opportunity remote or on-site?', a: data.location ? `Location mentioned: ${data.location}. Please verify on the official page.` : 'Please check the official link for location details.' },
            { q: 'How should I apply?', a: data.howToApply || 'Use the official apply link provided on this page.' }
        ];

        const related = list
            .filter(item => item.slug !== slug)
            .sort((a, b) => new Date(b.postedDate || 0) - new Date(a.postedDate || 0))
            .slice(0, 4);

        const contentHtml = `
            <article class="max-w-4xl mx-auto">
                <h1 class="text-3xl md:text-4xl font-bold mb-2">${escapeHtml(data.title || 'Opportunity')}</h1>
                <p class="text-gray-600 mb-6">Published on ${escapeHtml(fmtDate(data.postedDate))}</p>

                <figure class="mb-6">
                    <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(imageAlt)}" class="w-full rounded-lg border border-gray-200" loading="eager" decoding="async" onerror="this.onerror=null;this.src='${defaultImagePath(category)}';">
                </figure>

                <div class="prose max-w-none mb-6">
                    <p class="text-lg leading-relaxed">${escapeHtml(data.intro || data.excerpt || '')}</p>
                </div>

                <div class="grid md:grid-cols-3 gap-4 mb-8">
                    <div class="bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <p class="text-sm text-gray-500">Role Type</p>
                        <p class="font-semibold text-blue-700">${escapeHtml(pageLabel(category))}</p>
                    </div>
                    <div class="bg-green-50 border border-green-100 rounded-lg p-4">
                        <p class="text-sm text-gray-500">Company / Organizer</p>
                        <p class="font-semibold text-green-700">${escapeHtml(data.company || 'Not specified')}</p>
                    </div>
                    <div class="bg-amber-50 border border-amber-100 rounded-lg p-4">
                        <p class="text-sm text-gray-500">Location</p>
                        <p class="font-semibold text-amber-700">${escapeHtml(data.location || 'Not specified')}</p>
                    </div>
                </div>
<div class="bg-gray-50 rounded-lg p-6 mb-8">
                    <h2 class="text-xl font-bold mb-4">Overview</h2>
                    <div class="grid md:grid-cols-2 gap-4">
                        <div><span class="font-semibold">Company:</span> ${escapeHtml(data.company || 'Not specified')}</div>
                        <div><span class="font-semibold">Type:</span> ${escapeHtml(pageLabel(category))}</div>
                        <div><span class="font-semibold">Qualification:</span> ${escapeHtml(data.qualification || 'Not specified')}</div>
                        <div><span class="font-semibold">Experience:</span> ${escapeHtml(data.experience || 'Not specified')}</div>
                        <div><span class="font-semibold">Batch:</span> ${escapeHtml(data.batch || 'Not specified')}</div>
                        <div><span class="font-semibold">Salary:</span> ${escapeHtml(data.salary || 'Not specified')}</div>
                        <div><span class="font-semibold">Location:</span> ${escapeHtml(data.location || 'Not specified')}</div>
                        <div><span class="font-semibold">Last Date:</span> ${escapeHtml(data.lastDate || 'Not specified')}</div>
                    </div>
                </div>

                <h2 class="text-2xl font-bold mb-4">Description</h2>
                <p class="mb-6">${escapeHtml(data.jobDescription || data.excerpt || 'Details will be updated soon.')}</p>

                <h2 class="text-2xl font-bold mb-4">About the Company / Organizer</h2>
                <p class="mb-6">${paragraphHtml(data.aboutCompany, `${data.company || 'This organization'} offers opportunities for students to build practical skills and real-world experience. Check the official link for complete details and updates.`)}</p>

                <h2 class="text-2xl font-bold mb-4">Responsibilities</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(data.responsibilities, 'Details not specified')}</ul>

                <h2 class="text-2xl font-bold mb-4">Minimum Qualifications</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(data.minQualifications, 'Details not specified')}</ul>

                ${Array.isArray(data.prefQualifications) && data.prefQualifications.length ? `
                <h2 class="text-2xl font-bold mb-4">Preferred Qualifications</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(data.prefQualifications, '')}</ul>
                ` : ''}

                <h2 class="text-2xl font-bold mb-4">Important Timeline</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(timelineItems, 'Timeline will be updated soon.')}</ul>

                <h2 class="text-2xl font-bold mb-4">How to Apply</h2>
                <p class="mb-4">${escapeHtml(data.howToApply || 'Use the official link to apply.')}</p>

                ${applyBtn ? `<div class="text-center my-8">${applyBtn}</div>` : ''}
<h2 class="text-2xl font-bold mb-4">Preparation Tips</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(tips, 'Prepare your profile and apply early.')}</ul>

                <h2 class="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
                <div class="space-y-4 mb-8">
                    ${faq.map(item => `
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p class="font-semibold mb-2">${escapeHtml(item.q || 'Question')}</p>
                        <p class="text-gray-700">${escapeHtml(item.a || 'Answer will be updated soon.')}</p>
                    </div>`).join('')}
                </div>

                ${related.length ? `
                <h2 class="text-2xl font-bold mb-4">Related Opportunities</h2>
                <div class="grid md:grid-cols-2 gap-4 mb-4">
                    ${related.map(item => `
                    <a href="${escapeHtml(item.url || `/${category}/${item.slug}.html`)}" class="block bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
                        <p class="font-semibold text-blue-700 mb-1">${escapeHtml(item.title || 'Opportunity')}</p>
                        <p class="text-sm text-gray-600">${escapeHtml(item.company || 'Company')} • ${escapeHtml(fmtDate(item.postedDate))}</p>
                    </a>`).join('')}
                </div>` : ''}
            </article>
        `;

        document.getElementById('content-root').innerHTML = contentHtml;

        const locationData = parseLocation(data.location);
        const jsonLd = category === 'jobs'
            ? {
                '@context': 'https://schema.org/',
                '@type': 'JobPosting',
                title: data.title || 'Opportunity',
                description: data.jobDescription || data.excerpt || '',
                image: imageAbsolute,
                datePosted: toIsoDate(data.postedDate) || new Date().toISOString().slice(0, 10),
                validThrough: toIsoDate(data.lastDate) || undefined,
                employmentType: 'FULL_TIME',
                baseSalary: parseBaseSalary(data.salary) || undefined,
                hiringOrganization: {
                    '@type': 'Organization',
                    name: data.company || 'Company',
                    sameAs: data.applyLink || undefined
                },
                applicantLocationRequirements: {
                    '@type': 'Country',
                    name: locationData.country
                },
                jobLocationType: locationData.remote ? 'TELECOMMUTE' : undefined,
                jobLocation: locationData.remote
                    ? undefined
                    : {
                        '@type': 'Place',
                        address: {
                            '@type': 'PostalAddress',
                            addressLocality: locationData.locality || 'Bengaluru',
                            addressRegion: locationData.region || undefined,
                            addressCountry: locationData.country
                        }
                    }
            }
            : {
                '@context': 'https://schema.org/',
                '@type': 'WebPage',
                name: data.title || 'Opportunity',
                description: description,
                url: canonical
            };
        const schemaEl = document.getElementById('job-schema');
        if (schemaEl) schemaEl.textContent = JSON.stringify(jsonLd);
    }

    document.addEventListener('DOMContentLoaded', function () {
        render().catch(function (err) {
            console.warn('Content render fallback:', err && err.message ? err.message : err);
            const root = document.getElementById('content-root');
            if (root) root.innerHTML = '<p class="text-center text-red-600">Failed to load content. Please try again.</p>';
        });
    });
})();
