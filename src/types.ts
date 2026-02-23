export type Category = "jobs" | "internships" | "hackathons" | "projects";
export type OpportunityType = "job" | "internship" | "hackathon" | "project";

export interface Opportunity {
  id?: number;
  title: string;
  company: string;
  slug: string;
  type: OpportunityType;
  location?: string;
  postedDate?: string;
  excerpt?: string;
  applyLink?: string;
  qualification?: string;
  experience?: string;
  salary?: string;
  batch?: string;
  url?: string;
}

export interface OpportunityDetail {
  intro?: string;
  lastDate?: string;
  jobDescription?: string;
  responsibilities?: string[];
  minQualifications?: string[];
  prefQualifications?: string[];
  howToApply?: string;
  image?: string;
  imageAlt?: string;
  [key: string]: unknown;
}
