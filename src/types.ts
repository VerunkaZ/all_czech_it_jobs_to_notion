export interface JobOffer {
    /** Stable key used for deduplication across runs, e.g. "jobs.cz:https://...". */
    id: string;
    source: 'jobs.cz' | 'profesia.cz' | 'junior.guru' | 'datatalk.cz' | 'titans.cz';
    title: string;
    company: string | null;
    location: string | null;
    salary: string | null;
    url: string;
    query: string;
    scrapedAt: string;
}

export interface Input {
    /** Search terms, one search per term on each board. */
    searchQueries?: string[];
    /** Which job boards to query. */
    sources?: JobOffer['source'][];
    /** Max offers per search term per board (passed to the child Actor). */
    maxItemsPerSource?: number;
    /** Keyword groups switched on by the user (see filters.ts KEYWORD_GROUPS). */
    groupDataBi?: boolean;
    groupBackendFrontend?: boolean;
    groupQaTesting?: boolean;
    groupDevopsCloud?: boolean;
    groupSecurity?: boolean;
    groupItSupport?: boolean;
    groupProjectProduct?: boolean;
    groupSapErp?: boolean;
    /** Extra words matched against the job title. */
    customKeywords?: string[];
    /** Offers whose title contains any of these words are dropped. */
    excludeKeywords?: string[];
    /** Notion internal integration token. Store as a secret input. */
    notionToken?: string;
    /** ID of the Notion database to write offers into. */
    notionDatabaseId?: string;
}
