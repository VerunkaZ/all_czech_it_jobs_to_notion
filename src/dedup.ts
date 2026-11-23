import { Actor } from 'apify';
import type { JobOffer } from './types.js';

// Persisted between runs in the default key-value store so each scheduled run
// only reports offers it has not seen before.
const STORE_KEY = 'SEEN_JOB_IDS';

export async function loadSeenIds(): Promise<Set<string>> {
    const stored = await Actor.getValue<string[]>(STORE_KEY);
    return new Set(stored ?? []);
}

export async function saveSeenIds(ids: Set<string>): Promise<void> {
    // Keep the list bounded so the store does not grow forever.
    const arr = [...ids].slice(-20000);
    await Actor.setValue(STORE_KEY, arr);
}

export function filterNew(offers: JobOffer[], seen: Set<string>): JobOffer[] {
    const unique = new Map<string, JobOffer>();
    for (const offer of offers) {
        if (!seen.has(offer.id) && !unique.has(offer.id)) unique.set(offer.id, offer);
    }
    return [...unique.values()];
}
