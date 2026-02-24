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

    function detailPageUrl(category, slug) {
        const safeCategory = encodeURIComponent(String(category || 'jobs'));
        const safeSlug = encodeURIComponent(String(slug || ''));
        return `/opportunity.html?category=${safeCategory}&slug=${safeSlug}`;
    }

    function getQueryParams() {
        return new URLSearchParams(window.location.search || '');
    }

    function fileSlugFromPath() {
        const querySlug = getQueryParams().get('slug');
        if (querySlug) return querySlug;
        const parts = window.location.pathname.split('/').filter(Boolean);
        const file = parts[parts.length - 1] || '';
        return file.replace(/\.html$/i, '');
    }

    function categoryFromPath() {
        const queryCategory = getQueryParams().get('category');
        if (queryCategory && DATA_FILES[queryCategory]) return queryCategory;
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

    function toIsoDateTimeEndOfDay(value) {
        const datePart = toIsoDate(value);
        if (!datePart) return null;
        return `${datePart}T23:59:59Z`;
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
        if (!text) {
            return {
                remote: false,
                locality: null,
                region: null,
                postalCode: null,
                streetAddress: null,
                countryCode: 'IN',
                countryName: 'India'
            };
        }

        const remote = /remote|worldwide|anywhere|global/i.test(text);
        const parts = text.split(',').map(function (v) { return v.trim(); }).filter(Boolean);
        const lower = text.toLowerCase();
        const postalMatch = text.match(/\b(\d{5,6})\b/);

        let countryCode = 'IN';
        let countryName = 'India';
        if (/\busa\b|\bunited states\b|\bus\b/.test(lower)) {
            countryCode = 'US';
            countryName = 'United States';
        } else if (/\bcanada\b|\bca\b/.test(lower)) {
            countryCode = 'CA';
            countryName = 'Canada';
        } else if (/\bgermany\b|\bde\b/.test(lower)) {
            countryCode = 'DE';
            countryName = 'Germany';
        } else if (/\beurope\b/.test(lower)) {
            countryCode = 'EU';
            countryName = 'Europe';
        } else if (/\bphilippines\b/.test(lower)) {
            countryCode = 'PH';
            countryName = 'Philippines';
        } else if (/\bsouth africa\b/.test(lower)) {
            countryCode = 'ZA';
            countryName = 'South Africa';
        } else if (/\bjamaica\b/.test(lower)) {
            countryCode = 'JM';
            countryName = 'Jamaica';
        } else if (/\bisrael\b/.test(lower)) {
            countryCode = 'IL';
            countryName = 'Israel';
        } else if (/\bindia\b|\bin\b/.test(lower)) {
            countryCode = 'IN';
            countryName = 'India';
        }

        return {
            remote: remote,
            locality: parts[0] || text,
            region: parts.length > 1 ? parts[1] : null,
            postalCode: postalMatch ? postalMatch[1] : null,
            streetAddress: text,
            countryCode: countryCode,
            countryName: countryName
        };
    }

    function googleImageSearchUrl(title) {
        const query = `${title || 'project'} system architecture diagram`;
        return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
    }

    function inferProjectDomain(title) {
        const t = String(title || '').toLowerCase();
        if (/ai|ml|machine learning|deep learning|nlp|computer vision/.test(t)) return 'Artificial Intelligence';
        if (/cloud|aws|azure|gcp|devops|kubernetes|docker/.test(t)) return 'Cloud Computing';
        if (/blockchain|web3|crypto/.test(t)) return 'Blockchain';
        if (/cyber|security|soc|forensic/.test(t)) return 'Cybersecurity';
        if (/android|ios|mobile/.test(t)) return 'Mobile Development';
        if (/web|frontend|backend|full stack/.test(t)) return 'Web Development';
        if (/data|analytics|bi|visualization/.test(t)) return 'Data Analytics';
        if (/iot|embedded|sensor|robot/.test(t)) return 'IoT / Embedded Systems';
        return 'Software Engineering';
    }

    function generatedExcerpt(data, category) {
        const title = String(data && data.title ? data.title : 'Opportunity').trim();
        const company = String(data && data.company ? data.company : 'the organization').trim();

        if (category === 'projects') {
            const domain = inferProjectDomain(title);
            return `${title} is a college student project title in ${domain} by ${company}. Build a structured solution with clear modules, outcomes, and future enhancements.`;
        }

        if (category === 'hackathons') {
            return `${company} is organizing ${title}. Review problem statement, eligibility, timeline, and submit before deadline.`;
        }

        if (category === 'internships') {
            return `${company} is offering ${title}. Check eligibility, required skills, and application process.`;
        }

        return `${company} is hiring for ${title}. Check role details, qualifications, and official application steps.`;
    }

    async function copyText(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (_err) {
            // Fallback below.
        }
        try {
            const area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', 'readonly');
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            document.execCommand('copy');
            document.body.removeChild(area);
            return true;
        } catch (_err) {
            return false;
        }
    }

    function categoryContentConfig(category) {
        const map = {
            jobs: {
                descriptionTitle: 'Job Description',
                responsibilitiesTitle: 'Responsibilities',
                qualificationsTitle: 'Minimum Qualifications',
                preferredTitle: 'Preferred Qualifications',
                timelineTitle: 'Important Timeline',
                applyTitle: 'How to Apply',
                tipsTitle: 'Preparation Tips',
                descFallback: 'Role details will be updated soon.',
                tipsFallback: [
                    'Keep your resume updated and tailored to this role.',
                    'Highlight relevant projects, internships, or hackathon work.',
                    'Review core technical topics and practice problem-solving before assessments.'
                ]
            },
            internships: {
                descriptionTitle: 'Internship Description',
                responsibilitiesTitle: 'Key Responsibilities',
                qualificationsTitle: 'Eligibility',
                preferredTitle: 'Preferred Skills',
                timelineTitle: 'Important Timeline',
                applyTitle: 'How to Apply',
                tipsTitle: 'Internship Preparation Tips',
                descFallback: 'Internship details will be updated soon.',
                tipsFallback: [
                    'Prepare a concise resume with projects and academic strengths.',
                    'Review fundamentals related to the internship domain.',
                    'Apply early and track updates from the official portal.'
                ]
            },
            hackathons: {
                descriptionTitle: 'Hackathon Details',
                responsibilitiesTitle: 'What You Will Work On',
                qualificationsTitle: 'Eligibility',
                preferredTitle: 'Recommended Skills',
                timelineTitle: 'Event Timeline',
                applyTitle: 'How to Register',
                tipsTitle: 'Participation Tips',
                descFallback: 'Hackathon details will be updated soon.',
                tipsFallback: [
                    'Build a small team with complementary skills.',
                    'Prepare a practical idea aligned with the problem statement.',
                    'Focus on a working prototype and clear demo flow.'
                ]
            },
            projects: {
                descriptionTitle: 'Project Description',
                responsibilitiesTitle: 'Project Tasks',
                qualificationsTitle: 'Prerequisites',
                preferredTitle: 'Recommended Skills',
                timelineTitle: 'Project Timeline',
                applyTitle: 'How to Join',
                tipsTitle: 'Execution Tips',
                descFallback: 'Project details will be updated soon.',
                tipsFallback: [
                    'Define scope and milestones before you start.',
                    'Document your work and commits regularly.',
                    'Showcase your final output with clear problem-solution impact.'
                ],
                projectModulesTitle: 'Project Modules',
                requiredModulesTitle: 'Necessary Modules / Stack',
                futureEnhancementsTitle: 'Future Enhancements'
            }
        };
        return map[category] || map.jobs;
    }

    function overviewRows(category, data, typeLabel) {
        const rows = [
            { label: 'Company', value: data.company || 'Not specified' },
            { label: 'Type', value: typeLabel },
            { label: 'Location', value: data.location || 'Not specified' },
            { label: 'Last Date', value: data.lastDate || 'Not specified' }
        ];

        if (category === 'jobs' || category === 'internships') {
            rows.splice(2, 0,
                { label: 'Qualification', value: data.qualification || 'Not specified' },
                { label: 'Experience', value: data.experience || 'Not specified' },
                { label: 'Batch', value: data.batch || 'Not specified' },
                { label: 'Salary', value: data.salary || 'Not specified' }
            );
        }

        return rows;
    }

    function projectTemplateData(data) {
        const title = data.title || 'Project';
        const company = data.company || 'Organizer';
        const domain = data.domain || inferProjectDomain(title);
        const rawModules = Array.isArray(data.projectModules) && data.projectModules.length ? data.projectModules : [
            { name: 'Core Module', description: 'Implements the primary project workflow and business logic.' },
            { name: 'Interface Module', description: 'Provides user-facing screens and interactions.' },
            { name: 'Data Module', description: 'Handles data ingestion, validation, persistence, and retrieval.' }
        ];
        const modules = rawModules.map(function (item) {
            if (typeof item === 'string') {
                return {
                    name: item,
                    description: 'Module details will be expanded based on project scope.'
                };
            }
            return {
                name: item && item.name ? item.name : 'Module',
                description: item && item.description ? item.description : 'Module details will be expanded based on project scope.'
            };
        });

        return {
            introduction: data.projectIntroduction || `${title} is a college student project title designed to solve practical ${domain} problems through a structured implementation approach.`,
            problemStatement: data.problemStatement || `${company} needs a scalable and measurable ${domain} solution with clear architecture and execution milestones.`,
            domain: domain,
            duration: data.duration || '8-12 weeks',
            difficulty: data.difficulty || 'Intermediate',
            teamSize: data.teamSize || '2-4 members',
            commitment: data.commitment || '6-8 hours/week',
            objectives: Array.isArray(data.projectObjectives) && data.projectObjectives.length ? data.projectObjectives : [
                'Analyze the problem domain using available historical and contextual data.',
                'Design and implement a robust project solution workflow.',
                'Evaluate outcomes using measurable technical and business metrics.',
                'Build a usable dashboard or output layer for decision-making support.'
            ],
            methodology: Array.isArray(data.projectMethodology) && data.projectMethodology.length ? data.projectMethodology : [
                { title: 'Step 1: Data Collection', points: ['Collect historical and operational data relevant to project scope.', 'Gather external factors where applicable.'] },
                { title: 'Step 2: Data Preprocessing', points: ['Handle missing values and outliers.', 'Normalize and transform the data for model/logic readiness.'] },
                { title: 'Step 3: Core Model / Logic Design', points: ['Implement baseline approach for project objectives.', 'Define evaluation baseline and expected output format.'] },
                { title: 'Step 4: Advanced Implementation', points: ['Add advanced models or optimization techniques.', 'Improve performance and reliability through tuning.'] },
                { title: 'Step 5: Evaluation', points: ['Measure output quality with objective metrics.', 'Compare methods and select best-performing approach.'] },
                { title: 'Step 6: Visualization & Dashboard', points: ['Create visual insights for trends, outputs, and comparisons.', 'Build user-friendly dashboard pages for final presentation.'] }
            ],
            architecture: Array.isArray(data.systemArchitecture) && data.systemArchitecture.length ? data.systemArchitecture : [
                'Data Input Layer',
                'Data Preprocessing Module',
                'Core Processing / Modeling Module',
                'Evaluation Module',
                'Visualization & Web Dashboard'
            ],
            modules: modules,
            outcomes: Array.isArray(data.expectedOutcomes) && data.expectedOutcomes.length ? data.expectedOutcomes : [
                'Deliver accurate and actionable project outputs.',
                'Improve planning and decision support.',
                'Reduce inefficiencies in execution.',
                'Provide reusable and scalable project structure.'
            ],
            tools: Array.isArray(data.toolsAndTechnologies) && data.toolsAndTechnologies.length ? data.toolsAndTechnologies : [
                { category: 'Programming Language', tools: 'Python / JavaScript' },
                { category: 'Libraries / Frameworks', tools: 'Pandas, NumPy, Scikit-learn, React (as needed)' },
                { category: 'Visualization', tools: 'Matplotlib, Seaborn, Plotly / Chart.js' },
                { category: 'Deployment', tools: 'Flask / Streamlit / Node.js' },
                { category: 'Database', tools: 'MongoDB / PostgreSQL / CSV' }
            ],
            innovation: Array.isArray(data.innovationAspect) && data.innovationAspect.length ? data.innovationAspect : [
                'Hybrid approach combining statistical and ML techniques where applicable.',
                'Comparative evaluation for selecting best solution path.',
                'Dashboard-driven insights for practical decision support.'
            ],
            futureEnhancements: Array.isArray(data.futureEnhancements) && data.futureEnhancements.length ? data.futureEnhancements : [
                'Integrate real-time external APIs.',
                'Add recommendation/automation features.',
                'Enable deeper module-level predictions and alerts.',
                'Integrate with enterprise management systems.'
            ],
            skillsYouGain: Array.isArray(data.skillsYouGain) && data.skillsYouGain.length ? data.skillsYouGain : [
                'Problem decomposition and project scoping',
                'Architecture design and implementation',
                'Testing, evaluation, and result storytelling',
                'Portfolio presentation and technical communication'
            ],
            milestones: Array.isArray(data.weeklyMilestones) && data.weeklyMilestones.length ? data.weeklyMilestones : [
                { week: 'Week 1-2', goal: 'Requirement analysis, dataset/resources setup, architecture planning' },
                { week: 'Week 3-4', goal: 'Core module development and baseline output generation' },
                { week: 'Week 5-6', goal: 'Advanced improvements, optimization, and integration' },
                { week: 'Week 7-8', goal: 'Evaluation, dashboard, documentation, and final presentation' }
            ],
            deliverables: Array.isArray(data.projectDeliverables) && data.projectDeliverables.length ? data.projectDeliverables : [
                'Source code repository with clean README',
                'Architecture diagram and module documentation',
                'Results dashboard/screenshots',
                'Final presentation or demo video'
            ],
            resumePoints: Array.isArray(data.resumeHighlights) && data.resumeHighlights.length ? data.resumeHighlights : [
                'Built an end-to-end project with structured modules and measurable outcomes.',
                'Implemented evaluation-driven improvements and presented comparative results.',
                'Created production-style documentation and project dashboard for decision support.'
            ],
            whyGood: Array.isArray(data.whyGoodProject) && data.whyGoodProject.length ? data.whyGoodProject : [
                'Strong technical foundation and real-world relevance.',
                'Clear evaluation metrics and measurable outcomes.',
                'High industry applicability and portfolio value.'
            ]
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

        const data = Object.assign({}, base);
        const pageTitle = `${data.title} | StudentTechProjects`;
        const description = data.excerpt || data.intro || generatedExcerpt(data, category);
        const canonical = `https://studenttechprojects.com${detailPageUrl(category, slug)}`;
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
        const typeConfig = categoryContentConfig(category);

        const tips = Array.isArray(data.tips) && data.tips.length ? data.tips : [
            ...typeConfig.tipsFallback
        ];

        const faq = Array.isArray(data.faq) && data.faq.length ? data.faq : [
            { q: 'Who can apply for this opportunity?', a: `Candidates meeting the listed qualifications and eligibility criteria can apply.` },
            { q: 'Is this opportunity remote or on-site?', a: data.location ? `Location mentioned: ${data.location}. Please verify on the official page.` : 'Please check the official link for location details.' },
            { q: 'How should I apply?', a: data.howToApply || 'Use the official apply link provided on this page.' }
        ];
        const pageTypeLabel = pageLabel(category);
        const overview = overviewRows(category, data, pageTypeLabel);
        const descText = data.jobDescription || data.description || data.excerpt || generatedExcerpt(data, category) || typeConfig.descFallback;
        const projectModules = Array.isArray(data.projectModules) && data.projectModules.length
            ? data.projectModules
            : [
                'Core module implementation for key project workflow.',
                'User interface and interaction layer for end users.',
                'Data handling module for storage, retrieval, and validation.'
            ];
        const requiredModules = Array.isArray(data.requiredModules) && data.requiredModules.length
            ? data.requiredModules
            : [
                'Frontend framework/library for UI development.',
                'Backend API/service layer for business logic.',
                'Database and deployment tooling as per project scope.'
            ];
        const futureEnhancements = Array.isArray(data.futureEnhancements) && data.futureEnhancements.length
            ? data.futureEnhancements
            : [
                'Improve performance and scalability for production usage.',
                'Add analytics, monitoring, and reporting capabilities.',
                'Introduce automation and AI-assisted features where relevant.'
            ];

        const related = list
            .filter(item => item.slug !== slug)
            .sort((a, b) => {
                const bDate = new Date(b.postedAt || b.postedDate || 0).getTime();
                const aDate = new Date(a.postedAt || a.postedDate || 0).getTime();
                if (bDate !== aDate) return bDate - aDate;
                const bId = Number(b.id) || 0;
                const aId = Number(a.id) || 0;
                return bId - aId;
            })
            .filter(function (item, index, arr) {
                const key = String(item.applyLink || '').trim().toLowerCase()
                    || String(item.slug || '').trim().toLowerCase()
                    || `${String(item.type || '').toLowerCase()}|${String(item.title || '').toLowerCase()}|${String(item.company || '').toLowerCase()}`;
                return arr.findIndex(function (x) {
                    const xKey = String(x.applyLink || '').trim().toLowerCase()
                        || String(x.slug || '').trim().toLowerCase()
                        || `${String(x.type || '').toLowerCase()}|${String(x.title || '').toLowerCase()}|${String(x.company || '').toLowerCase()}`;
                    return xKey === key;
                }) === index;
            })
            .slice(0, 4);

        const supportBlock = `
            <div class="mt-10 border border-emerald-200 bg-emerald-50 rounded-lg p-5">
                <div class="flex items-center gap-3 mb-2">
                    <img src="/images/softsite-solutions-logo.svg" alt="SoftSiteSolutions" class="h-8 w-auto" loading="lazy" decoding="async">
                </div>
                <p class="text-gray-700 mb-3">Need help to start your business or build your project?</p>
                <a href="https://www.softsitesolution.in" target="_blank" rel="noopener noreferrer" class="inline-block bg-emerald-600 text-white px-5 py-2 rounded-lg hover:bg-emerald-700 transition">Contact SoftSiteSolutions</a>
            </div>
        `;

        let contentHtml = '';
        if (category === 'projects') {
            const project = projectTemplateData(data);
            const architectureSearchUrl = googleImageSearchUrl(data.title || 'project');
            contentHtml = `
            <article class="max-w-4xl mx-auto">
                <h1 class="text-3xl md:text-4xl font-bold mb-2">${escapeHtml(data.title || 'Project')}</h1>
                <p class="text-gray-600 mb-6">Published on ${escapeHtml(fmtDate(data.postedDate))}</p>

                <figure class="mb-6">
                    <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(imageAlt)}" class="w-full rounded-lg border border-gray-200" loading="eager" decoding="async" onerror="this.onerror=null;this.src='${defaultImagePath(category)}';">
                </figure>

                <div class="grid md:grid-cols-4 gap-4 mb-8">
                    <div class="bg-blue-50 border border-blue-100 rounded-lg p-4"><p class="text-sm text-gray-500">Domain</p><p class="font-semibold text-blue-700">${escapeHtml(project.domain)}</p></div>
                    <div class="bg-indigo-50 border border-indigo-100 rounded-lg p-4"><p class="text-sm text-gray-500">Duration</p><p class="font-semibold text-indigo-700">${escapeHtml(project.duration)}</p></div>
                    <div class="bg-amber-50 border border-amber-100 rounded-lg p-4"><p class="text-sm text-gray-500">Difficulty</p><p class="font-semibold text-amber-700">${escapeHtml(project.difficulty)}</p></div>
                    <div class="bg-emerald-50 border border-emerald-100 rounded-lg p-4"><p class="text-sm text-gray-500">Team Size</p><p class="font-semibold text-emerald-700">${escapeHtml(project.teamSize)}</p></div>
                </div>

                <div class="grid md:grid-cols-2 gap-4 mb-8">
                    <div class="bg-white border border-gray-200 rounded-lg p-4">
                        <p class="text-sm text-gray-500 mb-1">Weekly Commitment</p>
                        <p class="font-semibold text-gray-900 mb-3">${escapeHtml(project.commitment)}</p>
                        <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div class="h-2 bg-blue-600 rounded-full" style="width: 72%"></div>
                        </div>
                        <p class="text-xs text-gray-500 mt-2">Estimated completion confidence for focused students: High</p>
                    </div>
                    <div class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-4 text-white">
                        <p class="text-sm uppercase tracking-wide opacity-90 mb-1">Student Boost</p>
                        <p class="font-semibold mb-2">Complete this project to improve portfolio strength and interview storytelling.</p>
                        <p class="text-sm opacity-90">Tip: Publish your architecture and outcomes as a case study link.</p>
                    </div>
                </div>

                <div class="bg-white border border-gray-200 rounded-lg p-4 mb-8">
                    <h2 class="text-lg font-bold mb-2">Share & Resources</h2>
                    <div class="flex flex-wrap gap-3">
                        <button id="share-project-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">Share Project</button>
                        <button data-copy-text="${escapeHtml(canonical)}" class="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition">Copy Project Link</button>
                        <a href="${escapeHtml(architectureSearchUrl)}" target="_blank" rel="noopener noreferrer" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Open Google Architecture Images</a>
                        <button data-copy-text="${escapeHtml(architectureSearchUrl)}" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition">Copy Google Image Link</button>
                    </div>
                    <p class="text-sm text-gray-500 mt-3">Architecture links are loaded directly from Google search (no image stored on this server).</p>
                </div>

                <div class="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-8">
                    <h2 class="text-xl font-bold mb-3">Project Navigation</h2>
                    <div class="grid md:grid-cols-2 gap-2 text-blue-700">
                        <a href="#sec-intro" class="hover:underline">1. Introduction</a>
                        <a href="#sec-problem" class="hover:underline">2. Problem Statement</a>
                        <a href="#sec-objectives" class="hover:underline">3. Objectives</a>
                        <a href="#sec-methodology" class="hover:underline">4. Methodology</a>
                        <a href="#sec-architecture" class="hover:underline">5. Architecture</a>
                        <a href="#sec-modules" class="hover:underline">6. Project Modules</a>
                        <a href="#sec-outcomes" class="hover:underline">7. Expected Outcomes</a>
                        <a href="#sec-tools" class="hover:underline">8. Tools & Technologies</a>
                        <a href="#sec-innovation" class="hover:underline">9. Innovation Aspect</a>
                        <a href="#sec-future" class="hover:underline">10. Future Enhancement</a>
                        <a href="#sec-why" class="hover:underline">11. Why This Is a Good Project</a>
                    </div>
                </div>

                <h2 id="sec-intro" class="text-2xl font-bold mb-3">1. Introduction</h2>
                <p class="mb-6">${escapeHtml(project.introduction)}</p>

                <h2 id="sec-problem" class="text-2xl font-bold mb-3">2. Problem Statement</h2>
                <p class="mb-6">${escapeHtml(project.problemStatement)}</p>

                <h2 id="sec-objectives" class="text-2xl font-bold mb-3">3. Objectives of the Project</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(project.objectives, 'Objectives will be updated soon.')}</ul>

                <h2 id="sec-methodology" class="text-2xl font-bold mb-3">4. Proposed Methodology</h2>
                <div class="space-y-4 mb-6">
                    ${project.methodology.map(function (step) {
                        return `
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <p class="font-semibold mb-2">${escapeHtml(step.title || 'Step')}</p>
                            <ul class="list-disc pl-6 space-y-2">${listHtml(step.points, 'Details will be updated soon.')}</ul>
                        </div>`;
                    }).join('')}
                </div>

                <h2 id="sec-architecture" class="text-2xl font-bold mb-3">5. System Architecture Overview</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(project.architecture, 'Architecture will be updated soon.')}</ul>

                <div class="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p class="font-semibold text-blue-800 mb-2">Need a reference architecture image?</p>
                    <div class="flex flex-wrap gap-3">
                        <a href="${escapeHtml(architectureSearchUrl)}" target="_blank" rel="noopener noreferrer" class="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Open Google Image Results</a>
                        <button data-copy-text="${escapeHtml(architectureSearchUrl)}" class="inline-block bg-white border border-blue-300 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100 transition">Copy Image Search Link</button>
                    </div>
                </div>

                <h2 id="sec-modules" class="text-2xl font-bold mb-3">6. Project Modules</h2>
                <div class="space-y-4 mb-6">
                    ${project.modules.map(function (moduleItem, index) {
                        return `
                        <div class="bg-white border border-gray-200 rounded-lg p-4">
                            <p class="font-semibold mb-1">Module ${index + 1}: ${escapeHtml(moduleItem.name)}</p>
                            <p class="text-gray-700">${escapeHtml(moduleItem.description)}</p>
                        </div>`;
                    }).join('')}
                </div>

                <h2 class="text-2xl font-bold mb-3">Student Skills You Will Gain</h2>
                <div class="grid md:grid-cols-2 gap-3 mb-6">
                    ${project.skillsYouGain.map(function (skill) {
                        return `<div class="bg-blue-50 border border-blue-100 rounded-lg p-3 text-blue-800 font-medium">${escapeHtml(skill)}</div>`;
                    }).join('')}
                </div>

                <h2 class="text-2xl font-bold mb-3">Weekly Milestones</h2>
                <div class="space-y-3 mb-6">
                    ${project.milestones.map(function (m) {
                        return `<div class="bg-gray-50 border border-gray-200 rounded-lg p-4"><p class="font-semibold text-gray-900">${escapeHtml(m.week || 'Week')}</p><p class="text-gray-700 mt-1">${escapeHtml(m.goal || 'Milestone details')}</p></div>`;
                    }).join('')}
                </div>

                <h2 id="sec-outcomes" class="text-2xl font-bold mb-3">7. Expected Outcomes</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(project.outcomes, 'Expected outcomes will be updated soon.')}</ul>

                <h2 id="sec-tools" class="text-2xl font-bold mb-3">8. Tools & Technologies</h2>
                <div class="overflow-x-auto mb-6">
                    <table class="min-w-full border border-gray-200 text-sm">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="text-left px-4 py-3 border-b border-gray-200">Category</th>
                                <th class="text-left px-4 py-3 border-b border-gray-200">Tools</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${project.tools.map(function (tool) {
                                return `<tr>
                                    <td class="px-4 py-3 border-b border-gray-100">${escapeHtml(tool.category || 'Category')}</td>
                                    <td class="px-4 py-3 border-b border-gray-100">${escapeHtml(tool.tools || 'Tools')}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>

                <h2 id="sec-innovation" class="text-2xl font-bold mb-3">9. Innovation Aspect</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(project.innovation, 'Innovation points will be updated soon.')}</ul>

                <h2 id="sec-future" class="text-2xl font-bold mb-3">10. Scope for Future Enhancement</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(project.futureEnhancements, 'Future enhancements will be updated soon.')}</ul>

                <h2 class="text-2xl font-bold mb-3">Project Deliverables Checklist</h2>
                <ul class="mb-6 space-y-2">
                    ${project.deliverables.map(function (item) {
                        return `<li class="flex items-start gap-2"><span class="mt-1 text-green-600">✔</span><span class="text-gray-800">${escapeHtml(item)}</span></li>`;
                    }).join('')}
                </ul>

                <h2 id="sec-why" class="text-2xl font-bold mb-3">11. Why This Is a Good Project</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(project.whyGood, 'This project has strong practical value for portfolio and industry use-cases.')}</ul>

                <h2 class="text-2xl font-bold mb-3">Resume-Ready Highlights</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(project.resumePoints, 'Add measurable highlights from your final project results.')}</ul>

                ${supportBlock}
            </article>
            `;
        } else {
            contentHtml = `
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
                        <p class="font-semibold text-blue-700">${escapeHtml(pageTypeLabel)}</p>
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
                        ${overview.map(function (row) {
                            return `<div><span class="font-semibold">${escapeHtml(row.label)}:</span> ${escapeHtml(row.value)}</div>`;
                        }).join('')}
                    </div>
                </div>

                <h2 class="text-2xl font-bold mb-4">${escapeHtml(typeConfig.descriptionTitle)}</h2>
                <p class="mb-6">${escapeHtml(descText)}</p>

                <h2 class="text-2xl font-bold mb-4">About the Company / Organizer</h2>
                <p class="mb-6">${paragraphHtml(data.aboutCompany, `${data.company || 'This organization'} offers opportunities for students to build practical skills and real-world experience. Check the official link for complete details and updates.`)}</p>

                <h2 class="text-2xl font-bold mb-4">${escapeHtml(typeConfig.responsibilitiesTitle)}</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(data.responsibilities, 'Details not specified')}</ul>

                <h2 class="text-2xl font-bold mb-4">${escapeHtml(typeConfig.qualificationsTitle)}</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(data.minQualifications, 'Details not specified')}</ul>

                ${Array.isArray(data.prefQualifications) && data.prefQualifications.length ? `
                <h2 class="text-2xl font-bold mb-4">${escapeHtml(typeConfig.preferredTitle)}</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(data.prefQualifications, '')}</ul>
                ` : ''}

                <h2 class="text-2xl font-bold mb-4">${escapeHtml(typeConfig.timelineTitle)}</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(timelineItems, 'Timeline will be updated soon.')}</ul>

                <h2 class="text-2xl font-bold mb-4">${escapeHtml(typeConfig.applyTitle)}</h2>
                <p class="mb-4">${escapeHtml(data.howToApply || 'Use the official link to apply.')}</p>

                ${applyBtn ? `<div class="text-center my-8">${applyBtn}</div>` : ''}
${category === 'projects' ? `
                <h2 class="text-2xl font-bold mb-4">${escapeHtml(typeConfig.projectModulesTitle)}</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(projectModules, 'Project modules will be updated soon.')}</ul>

                <h2 class="text-2xl font-bold mb-4">${escapeHtml(typeConfig.requiredModulesTitle)}</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(requiredModules, 'Necessary modules will be updated soon.')}</ul>

                <h2 class="text-2xl font-bold mb-4">${escapeHtml(typeConfig.futureEnhancementsTitle)}</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(futureEnhancements, 'Future enhancements will be updated soon.')}</ul>
` : ''}
<h2 class="text-2xl font-bold mb-4">${escapeHtml(typeConfig.tipsTitle)}</h2>
                <ul class="list-disc pl-6 mb-6 space-y-2">${listHtml(tips, typeConfig.tipsFallback[0])}</ul>

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
                    <a href="${escapeHtml(detailPageUrl(category, item.slug))}" class="block bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-sm transition">
                        <p class="font-semibold text-blue-700 mb-1">${escapeHtml(item.title || 'Opportunity')}</p>
                        <p class="text-sm text-gray-600">${escapeHtml(item.company || 'Company')} • ${escapeHtml(fmtDate(item.postedDate))}</p>
                    </a>`).join('')}
                </div>` : ''}
            </article>
        `;
        }

        document.getElementById('content-root').innerHTML = contentHtml;

        const copyButtons = document.querySelectorAll('[data-copy-text]');
        copyButtons.forEach(function (button) {
            button.addEventListener('click', async function () {
                const text = button.getAttribute('data-copy-text') || '';
                const ok = await copyText(text);
                const original = button.textContent;
                button.textContent = ok ? 'Copied' : 'Copy failed';
                setTimeout(function () { button.textContent = original; }, 1600);
            });
        });

        const shareProjectBtn = document.getElementById('share-project-btn');
        if (shareProjectBtn) {
            shareProjectBtn.addEventListener('click', async function () {
                const sharePayload = {
                    title: data.title || 'Project',
                    text: description,
                    url: canonical
                };
                try {
                    if (navigator.share) {
                        await navigator.share(sharePayload);
                    } else {
                        await copyText(canonical);
                        const original = shareProjectBtn.textContent;
                        shareProjectBtn.textContent = 'Link Copied';
                        setTimeout(function () { shareProjectBtn.textContent = original; }, 1600);
                    }
                } catch (_err) {
                    // User cancelled share action.
                }
            });
        }

        const locationData = parseLocation(data.location);
        const jsonLd = category === 'jobs'
            ? {
                '@context': 'https://schema.org/',
                '@type': 'JobPosting',
                title: data.title || 'Opportunity',
                description: data.jobDescription || data.excerpt || '',
                image: imageAbsolute,
                datePosted: toIsoDate(data.postedDate) || new Date().toISOString().slice(0, 10),
                validThrough: toIsoDateTimeEndOfDay(data.lastDate) || undefined,
                employmentType: 'FULL_TIME',
                baseSalary: parseBaseSalary(data.salary) || undefined,
                hiringOrganization: {
                    '@type': 'Organization',
                    name: data.company || 'Company',
                    sameAs: data.applyLink || undefined
                },
                applicantLocationRequirements: {
                    '@type': 'Country',
                    name: locationData.countryName
                },
                jobLocationType: locationData.remote ? 'TELECOMMUTE' : undefined,
                jobLocation: locationData.remote
                    ? undefined
                    : {
                        '@type': 'Place',
                        address: {
                            '@type': 'PostalAddress',
                            streetAddress: locationData.streetAddress || locationData.locality || 'Not specified',
                            addressLocality: locationData.locality || 'Not specified',
                            addressRegion: locationData.region || locationData.locality || 'Not specified',
                            postalCode: locationData.postalCode || '000000',
                            addressCountry: locationData.countryName
                        }
                    }
            }
            : category === 'projects'
                ? {
                    '@context': 'https://schema.org/',
                    '@type': 'Article',
                    headline: data.title || 'Project',
                    description: description,
                    image: imageAbsolute,
                    datePublished: toIsoDate(data.postedDate) || new Date().toISOString().slice(0, 10),
                    author: {
                        '@type': 'Organization',
                        name: data.company || 'StudentTechProjects'
                    },
                    mainEntityOfPage: canonical
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
