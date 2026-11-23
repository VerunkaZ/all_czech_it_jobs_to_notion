import { JUNIOR_GURU_URL, parseJuniorGuruListing } from './junior-guru.js';
import type { JobOffer } from '../types.js';

/**
 * Fetches the junior.guru listing and tags each offer with the query it matched.
 * junior.guru has no per-query search in this parser, so offers are kept when
 * the title contains the query (case-insensitive), or for every query when none is given.
 */
export async function runJuniorGuru(
    queries: string[],
    maxItems: number,
    fetchPage: (url: string) => Promise<string>,
): Promise<JobOffer[]> {
    const html = await fetchPage(JUNIOR_GURU_URL);
    const all = parseJuniorGuruListing(html);

    const result: JobOffer[] = [];
    for (const offer of all) {
        const matched = queries.find((q) => offer.title.toLowerCase().includes(q.toLowerCase()));
        if (queries.length > 0 && !matched) continue;
        result.push({ ...offer, query: matched ?? '' });
        if (result.length >= maxItems) break;
    }
    return result;
}
