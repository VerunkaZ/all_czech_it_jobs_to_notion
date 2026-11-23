import type { JobOffer } from './types.js';

/** Keyword groups. Each group is one role family a user can switch on. */
export const KEYWORD_GROUPS: Record<string, string[]> = {
    groupDataBi: ['data analyst', 'data engineer', 'data scientist', 'data architect', 'data platform', 'data consultant', 'data specialist', 'data governance', 'data quality', 'analytik', 'datový analytik', 'datový inženýr', 'BI', 'business intelligence', 'ETL', 'dbt', 'Power BI', 'Tableau', 'data warehouse', 'DWH', 'Databricks', 'Snowflake', 'BigQuery', 'SQL', 'machine learning', 'ML engineer', 'AI engineer', 'analytics engineer'],
    groupBackendFrontend: ['backend', 'frontend', 'full stack', 'fullstack', 'web developer', 'mobile developer', 'vývojář', 'programátor', 'Java', 'Python', '.NET', 'PHP', 'React', 'Angular', 'TypeScript'],
    groupQaTesting: ['QA', 'tester', 'test engineer', 'test automation'],
    groupDevopsCloud: ['devops', 'cloud', 'AWS', 'Azure', 'Kubernetes', 'Docker', 'site reliability', 'SRE', 'sysadmin', 'správce sítě', 'správce systémů'],
    groupSecurity: ['security', 'bezpečnost', 'kybernetická bezpečnost', 'penetration tester', 'SOC', 'cybersecurity'],
    groupItSupport: ['helpdesk', 'service desk', 'IT support', 'technická podpora', 'IT podpora', 'uživatelská podpora'],
    groupProjectProduct: ['project manager', 'product owner', 'scrum master', 'IT manager', 'vedoucí IT', 'IT projektový manažer'],
    groupSapErp: ['SAP', 'ABAP', 'ERP', 'Oracle', 'Salesforce'],
};

/** Build the list of keywords that are active for the chosen groups plus custom words. */
export function activeKeywords(enabledGroups: string[], customKeywords: string[]): string[] {
    const fromGroups = enabledGroups.flatMap((g) => KEYWORD_GROUPS[g] ?? []);
    return [...fromGroups, ...customKeywords].map((k) => k.trim()).filter((k) => k.length > 0);
}

/** True if the term appears as a whole word in the text (case-insensitive). */
function hasWord(text: string, term: string): boolean {
    const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'iu');
    return pattern.test(text);
}

/**
 * A job passes if its title contains at least one active keyword as a whole word,
 * and no exclude word appears in the title.
 */
export function matchesFilters(job: JobOffer, keywords: string[], excludeKeywords: string[]): boolean {
    const title = job.title;
    if (excludeKeywords.some((k) => k.trim() && hasWord(title, k.trim()))) return false;
    if (keywords.length === 0) return true;
    return keywords.some((k) => hasWord(title, k));
}
