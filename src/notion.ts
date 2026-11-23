import { log } from 'apify';
import type { JobOffer } from './types.js';

// Notion REST API. Pinned version header is required.
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/**
 * Creates one page per job offer in the given Notion database.
 *
 * The database must have these properties (names are case-sensitive):
 *   Name (title), Company (rich text), Location (rich text), Salary (rich text),
 *   Source (select), URL (url), Query (rich text), Scraped (date)
 *
 * The integration must be shared with the database in Notion
 * (database "..." menu > Connections > add your integration).
 */
export async function pushToNotion(
    offers: JobOffer[],
    token: string,
    databaseId: string,
): Promise<{ created: number; failed: number }> {
    let created = 0;
    let failed = 0;

    for (const offer of offers) {
        const body = {
            parent: { database_id: databaseId },
            properties: {
                Name: { title: [{ text: { content: offer.title.slice(0, 2000) } }] },
                Company: richText(offer.company),
                Location: richText(offer.location),
                Salary: richText(offer.salary),
                Source: { select: { name: offer.source } },
                URL: { url: offer.url },
                Query: richText(offer.query),
                Scraped: { date: { start: offer.scrapedAt } },
            },
        };

        const res = await fetch(`${NOTION_API}/pages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            created++;
        } else {
            failed++;
            log.warning(`Notion rejected "${offer.title}": ${res.status} ${await res.text()}`);
        }
    }

    return { created, failed };
}

/**
 * Reads every URL already stored in the Notion database, following pagination.
 * Used before scraping so offers already in Notion are skipped.
 * Throws on any API error, so the run stops instead of pushing duplicates.
 */
export async function loadExistingUrls(token: string, databaseId: string): Promise<Set<string>> {
    const urls = new Set<string>();
    let cursor: string | undefined;

    do {
        const res = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
        });
        if (!res.ok) {
            throw new Error(`Notion database query failed: ${res.status} ${await res.text()}`);
        }
        const data = (await res.json()) as {
            results: Array<{ properties?: { URL?: { url?: string | null } } }>;
            has_more: boolean;
            next_cursor: string | null;
        };
        for (const page of data.results) {
            const url = page.properties?.URL?.url;
            if (url) urls.add(url);
        }
        cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
    } while (cursor);

    return urls;
}

function richText(value: string | null) {
    return { rich_text: value ? [{ text: { content: value.slice(0, 2000) } }] : [] };
}
