import { Actor, log } from 'apify';
import type { JobOffer } from './types.js';

// Store Actors used for each source. Their input and output schemas were
// checked with fetch-actor-details before writing this file.
const JOBS_CZ_ACTOR = 'shahidirfan/Jobs-cz-Scraper';
const PROFESIA_CZ_ACTOR = 'unfenced-group/profesia-cz-scraper';

/**
 * Jobs.cz takes one keyword per run, so run it once per query.
 * Results are mapped into our common JobOffer shape.
 */
export async function runJobsCz(queries: string[], maxItems: number): Promise<JobOffer[]> {
    const offers: JobOffer[] = [];

    for (const query of queries) {
        const run = await Actor.call(JOBS_CZ_ACTOR, { keyword: query, results_wanted: maxItems, collectDetails: true });
        const items = await readDataset(run.defaultDatasetId);
        log.info(`jobs.cz "${query}": ${items.length} items from ${JOBS_CZ_ACTOR}`);
        for (const item of items) {
            offers.push(toOffer('jobs.cz', item, item.url ?? '', query));
        }
    }

    return offers;
}

/**
 * Profesia.cz takes one keyword per run, so run it once per query.
 */
export async function runProfesiaCz(queries: string[], maxItems: number): Promise<JobOffer[]> {
    const offers: JobOffer[] = [];

    for (const query of queries) {
        const run = await Actor.call(PROFESIA_CZ_ACTOR, { searchQuery: query, maxItems });
        const items = await readDataset(run.defaultDatasetId);
        log.info(`profesia.cz "${query}": ${items.length} items`);
        for (const item of items) {
            offers.push(toOffer('profesia.cz', item, query, 'profesia.cz'));
        }
    }

    return offers;
}

async function readDataset(datasetId: string): Promise<any[]> {
    const { items } = await Actor.apifyClient.dataset(datasetId).listItems();
    return items;
}

/**
 * Maps a raw item from a store Actor into our JobOffer shape.
 * Field names differ per Actor, so this reads the common candidates.
 */
function toOffer(source: JobOffer['source'], item: any, fallbackUrl: string, query: string): JobOffer {
    const url: string = item.url ?? item.jobUrl ?? item.link ?? fallbackUrl;
    const title: string = item.title ?? item.position ?? item.name ?? '';
    // Jobs.cz detail pages sometimes return "Detail pozice | <company>" as the company.
    const rawCompany: string | null = item.company ?? item.companyName ?? item.employer ?? null;
    const cleaned = rawCompany ? rawCompany.replace(/^Detail pozice\s*\|\s*/, '').trim() : '';
    // Placeholder text like "...kde jinde." is not a company name.
    const company = cleaned && !cleaned.startsWith('...') ? cleaned : null;
    return {
        id: `${source}:${url}`,
        source,
        title,
        company,
        location: item.location ?? item.city ?? null,
        salary: item.salary ?? item.salaryText ?? null,
        url,
        query: item.query ?? query,
        scrapedAt: new Date().toISOString(),
    };
}
