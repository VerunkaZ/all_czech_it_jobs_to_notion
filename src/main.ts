import { Actor, log } from 'apify';

import { loadSeenIds, saveSeenIds, filterNew } from './dedup.js';
import { pushToNotion, loadExistingUrls } from './notion.js';
import { matchesFilters, activeKeywords, KEYWORD_GROUPS } from './filters.js';
import { runJobsCz, runProfesiaCz } from './sources.js';
import { runDatatalk } from './sources/datatalk.js';
import { runJuniorGuru } from './sources/junior-guru-run.js';
import { runTitans } from './sources/titans.js';
import { fetchText } from './sources/fetch.js';
import type { JobOffer, Input } from './types.js';

await Actor.init();

const input = ((await Actor.getInput<Input>()) ?? {}) as Input;

const {
    searchQueries = ['data engineer', 'data analyst', 'python', 'machine learning', 'bi developer'],
    sources = ['jobs.cz', 'profesia.cz', 'junior.guru', 'datatalk.cz'],
    maxItemsPerSource = 5,
    customKeywords = [],
    excludeKeywords = [],
    notionToken,
    notionDatabaseId: notionDatabaseIdInput,
} = input;

// The database ID is read from the environment variable notion_database_id, falling back to the input.
const notionDatabaseId = process.env.notion_database_id ?? notionDatabaseIdInput;

// Keywords come from the enabled groups plus the user's custom words.
const enabledGroups = Object.keys(KEYWORD_GROUPS).filter((g) => input[g as keyof Input] === true);
const keywords = activeKeywords(enabledGroups, customKeywords);

// Offers already in the Notion database are skipped before scraping.
// Without a token and database ID, only the key-value store check applies.
const notionAuthToken = process.env.NOTION_TOKEN ?? notionToken;
const existingNotionUrls = notionAuthToken && notionDatabaseId
    ? await loadExistingUrls(notionAuthToken, notionDatabaseId)
    : new Set<string>();
if (existingNotionUrls.size > 0) {
    log.info(`Notion already holds ${existingNotionUrls.size} offer URLs; these are skipped.`);
}

// Run each source's Store Actor, collect everything into one list.
const collected: JobOffer[] = [];

if (sources.includes('jobs.cz')) {
    collected.push(...(await runJobsCz(searchQueries, maxItemsPerSource)));
}
if (sources.includes('profesia.cz')) {
    collected.push(...(await runProfesiaCz(searchQueries, maxItemsPerSource)));
}
if (sources.includes('junior.guru')) {
    collected.push(...(await runJuniorGuru(searchQueries, maxItemsPerSource, fetchText)));
}
if (sources.includes('datatalk.cz')) {
    collected.push(...(await runDatatalk(fetchText, searchQueries, maxItemsPerSource)));
}
if (sources.includes('titans.cz')) {
    collected.push(...(await runTitans(maxItemsPerSource, existingNotionUrls)));
}

// Dedupe against previous runs, apply keyword filters, push to Notion.
const seen = await loadSeenIds();
const fresh = filterNew(collected, seen).filter((offer) => !existingNotionUrls.has(offer.url));
const matching = fresh.filter((job) => matchesFilters(job, keywords, excludeKeywords));

log.info(`Collected ${collected.length} offers, ${fresh.length} new, ${matching.length} match filters`);

if (matching.length > 0) {
    await Actor.pushData(matching);
    const token = process.env.NOTION_TOKEN ?? notionToken;
    if (token && notionDatabaseId) {
        const result = await pushToNotion(matching, token, notionDatabaseId);
        log.info(`Notion: created ${result.created} pages, ${result.failed} failed`);
    } else {
        log.warning('No notionToken/notionDatabaseId in input, skipping Notion sync.');
    }
}

// Remember every new offer, even ones filtered out, so they are not re-checked next run.
for (const job of fresh) seen.add(job.id);
await saveSeenIds(seen);

await Actor.exit();
