const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PROJECTS_FILE = path.join(ROOT, 'data', 'projects.json');
const CONTENT_DIR = path.join(ROOT, 'data', 'content');

function buildTemplate(project) {
    const title = project.title || 'Project';
    const company = project.company || 'Organizer';
    const intro = project.excerpt || `${title} focuses on solving a practical problem using a structured implementation approach.`;

    return {
        intro: intro,
        lastDate: 'Not specified',
        jobDescription: `Detailed implementation plan for ${title} at ${company}.`,
        projectIntroduction: `${title} is designed as an industry-aligned project to build practical skills and deployable outcomes.`,
        problemStatement: `${company} and similar organizations require scalable, measurable, and data-driven project execution approaches.`,
        domain: 'Software Engineering',
        duration: '8-12 weeks',
        difficulty: 'Intermediate',
        teamSize: '2-4 members',
        commitment: '6-8 hours/week',
        projectObjectives: [
            'Analyze project requirements and define clear scope.',
            'Design and implement a robust technical solution.',
            'Measure outcomes using objective metrics.',
            'Present results through a structured dashboard/report.'
        ],
        projectMethodology: [
            { title: 'Step 1: Requirement Analysis', points: ['Identify business/technical goals.', 'Define measurable success criteria.'] },
            { title: 'Step 2: Data & Resource Preparation', points: ['Collect required inputs and datasets.', 'Prepare development and deployment environment.'] },
            { title: 'Step 3: Core Implementation', points: ['Build the main processing/business logic.', 'Validate core outputs with test scenarios.'] },
            { title: 'Step 4: Advanced Optimization', points: ['Improve performance, scalability, and reliability.', 'Refine architecture and edge-case handling.'] },
            { title: 'Step 5: Evaluation & Validation', points: ['Evaluate with relevant KPIs and metrics.', 'Compare approaches and finalize best version.'] },
            { title: 'Step 6: Visualization & Documentation', points: ['Prepare clear visual reports/dashboard.', 'Document architecture, setup, and outcomes.'] }
        ],
        systemArchitecture: [
            'Input Layer',
            'Preprocessing / Validation Layer',
            'Core Processing Layer',
            'Evaluation Layer',
            'Visualization & Reporting Layer'
        ],
        projectModules: [
            { name: 'Input Module', description: 'Collects and validates required project inputs.' },
            { name: 'Core Logic Module', description: 'Implements the main project algorithm/workflow.' },
            { name: 'Output Module', description: 'Generates insights, dashboards, and final outcomes.' }
        ],
        skillsYouGain: [
            'Problem decomposition and project scoping',
            'Architecture design and implementation',
            'Evaluation and result communication',
            'Portfolio presentation skills'
        ],
        weeklyMilestones: [
            { week: 'Week 1-2', goal: 'Scope, architecture, and setup completion' },
            { week: 'Week 3-4', goal: 'Core module development and baseline output' },
            { week: 'Week 5-6', goal: 'Optimization, integration, and validation' },
            { week: 'Week 7-8', goal: 'Documentation, dashboard, and final demo' }
        ],
        projectDeliverables: [
            'Source code repository with README',
            'Architecture and module documentation',
            'Output dashboard/screenshots',
            'Final presentation or walkthrough'
        ],
        resumeHighlights: [
            'Built a structured end-to-end project with measurable outcomes.',
            'Implemented module-wise architecture and optimization workflow.',
            'Delivered dashboard-driven results and final documentation.'
        ],
        expectedOutcomes: [
            'Deliver practical and measurable project output.',
            'Improve execution efficiency and decision support.',
            'Create portfolio-ready implementation and documentation.'
        ],
        toolsAndTechnologies: [
            { category: 'Programming Language', tools: 'Python / JavaScript' },
            { category: 'Frameworks/Libraries', tools: 'As per project requirement' },
            { category: 'Visualization', tools: 'Plotly / Matplotlib / Chart.js' },
            { category: 'Deployment', tools: 'Flask / Streamlit / Node.js' },
            { category: 'Database', tools: 'MongoDB / PostgreSQL / CSV' }
        ],
        innovationAspect: [
            'Combines practical engineering and data-driven validation.',
            'Focuses on measurable outcomes and usability.',
            'Supports scalable future enhancements.'
        ],
        futureEnhancements: [
            'Integrate external APIs and real-time input streams.',
            'Add automation and recommendation capabilities.',
            'Improve module-level analytics and alerting.'
        ],
        whyGoodProject: [
            'Strong real-world relevance and industry applicability.',
            'Demonstrates architecture, implementation, and evaluation skills.',
            'Creates high-value portfolio impact for students.'
        ],
        howToApply: 'Use the official apply link provided below.',
        author: 'StudentTechProjects Team',
        image: `/images/opportunities/${project.slug}.svg`,
        imageAlt: `${title} at ${company}`
    };
}

function mergeMissing(existing, template) {
    const merged = Object.assign({}, existing);
    for (const key of Object.keys(template)) {
        if (merged[key] === undefined || merged[key] === null || merged[key] === '' || (Array.isArray(merged[key]) && merged[key].length === 0)) {
            merged[key] = template[key];
        }
    }
    return merged;
}

function main() {
    const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
    let updated = 0;

    for (const project of projects) {
        if (!project.slug) continue;
        const target = path.join(CONTENT_DIR, `${project.slug}.json`);
        const template = buildTemplate(project);
        let content = {};

        if (fs.existsSync(target)) {
            content = JSON.parse(fs.readFileSync(target, 'utf8'));
            content = mergeMissing(content, template);
        } else {
            content = template;
        }

        fs.writeFileSync(target, JSON.stringify(content, null, 2) + '\n', 'utf8');
        updated += 1;
    }

    console.log(`Enriched ${updated} project content files`);
}

main();
