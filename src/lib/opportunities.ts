import fs from "node:fs";
import path from "node:path";
import type { Category, Opportunity, OpportunityDetail } from "../types";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const CONTENT_DIR = path.join(DATA_DIR, "content");

const FILES: Record<Category, string> = {
  jobs: "jobs.json",
  internships: "internships.json",
  hackathons: "hackathons.json",
  projects: "projects.json"
};

function readJson<T>(filePath: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadCategory(category: Category): Opportunity[] {
  const file = path.join(DATA_DIR, FILES[category]);
  const list = readJson<Opportunity[]>(file, []);
  return Array.isArray(list) ? list : [];
}

export function loadAllOpportunities(): Opportunity[] {
  const merged = ([] as Opportunity[])
    .concat(loadCategory("jobs"))
    .concat(loadCategory("internships"))
    .concat(loadCategory("hackathons"))
    .concat(loadCategory("projects"));

  return merged.sort(
    (a, b) =>
      new Date(b.postedDate || 0).getTime() - new Date(a.postedDate || 0).getTime()
  );
}

export function findBySlug(category: Category, slug: string): Opportunity | undefined {
  return loadCategory(category).find((item) => item.slug === slug);
}

export function loadDetail(slug: string): OpportunityDetail {
  const file = path.join(CONTENT_DIR, `${slug}.json`);
  return readJson<OpportunityDetail>(file, {});
}

export function toCategory(type: Opportunity["type"]): Category {
  if (type === "job") return "jobs";
  if (type === "internship") return "internships";
  if (type === "hackathon") return "hackathons";
  return "projects";
}

export function canonicalPath(category: Category, slug?: string): string {
  return slug ? `/${category}/${slug}/` : `/${category}/`;
}

export function formatDate(date?: string): string {
  if (!date) return "Not specified";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export function isNew(postedDate?: string): boolean {
  if (!postedDate) return false;
  const posted = new Date(postedDate);
  if (Number.isNaN(posted.getTime())) return false;
  const now = Date.now();
  const ageDays = (now - posted.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays <= 14;
}

export function experienceLabel(exp?: string): string {
  const value = (exp || "").trim();
  if (!value || value.toLowerCase() === "not specified") return "Experience: Not specified";
  if (/fresher|freshers|0\s*[-–]?\s*1?\s*year/i.test(value)) return "Fresher Friendly";
  return `Experience: ${value}`;
}

export function categoryLabel(category: Category): string {
  if (category === "jobs") return "Jobs";
  if (category === "internships") return "Internships";
  if (category === "hackathons") return "Hackathons";
  return "Projects";
}
