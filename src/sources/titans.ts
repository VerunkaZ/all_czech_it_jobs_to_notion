import * as cheerio from 'cheerio';
import type { JobOffer } from '../types.js';
import { canonicalId } from '../canonical.js';
import { fetchText } from './fetch.js';

export const TITANS_LISTING_URL = 'https://www.titans.cz/cs/nabidky-prace';

const PROJECTS_LISTING_URL = 'https://join.titans.eu/cs?text=';

const BASE = 'https://www.titans.cz';
const PROJECTS_BASE = 'https://join.titans.eu';

/**
 * Fetches listing pages, then every detail page, and returns the open offers.
 * Filled offers are dropped. `maxItems` caps the detail pages read per run.
 */
export async function runTitans(maxItems: number, knownUrls: Set<string> = new Set()): Promise<JobOffer[]> {
    const detailUrls: string[] = [];
    // Titans lists 8 or more pages of job offers; read up to 8 so later offers are not missed.
    for (let page = 1; page <= 8 && detailUrls.length < maxItems * 2; page++) {
        const jobsUrl = page === 1 ? TITANS_LISTING_URL : `${TITANS_LISTING_URL}?onlyOpen=0&type=2&pagenum=${page}`;
        const projectsUrl = page === 1 ? PROJECTS_LISTING_URL : `https://join.titans.eu/cs?text=&onlyOpen=0&pagenum=${page}&type=1`;
        for (const url of [...parseTitansListing(await fetchText(jobsUrl)), ...parseProjectsListing(await fetchText(projectsUrl))]) {
            if (!detailUrls.includes(url)) detailUrls.push(url);
        }
    }

    const offers: JobOffer[] = [];
    for (const url of detailUrls) {
        if (offers.length >= maxItems) break;
        // Skip offers already in Notion before spending a request on their detail page.
        if (knownUrls.has(url)) continue;
        const offer = parseTitansDetail(await fetchText(url), url);
        if (offer) offers.push(offer);
    }
    return offers;
}

/**
 * Collects detail-page URLs from one listing page.
 * Detail pages look like /cs/nabidky-prace/<slug>-<refcode>.
 * The listing and filter links (with a query string or no slug) are skipped.
 */
export function parseProjectsListing(html: string): string[] {
    const $ = cheerio.load(html);
    const urls = new Set<string>();

    $('a[href*="join.titans.eu/cs/"], a[href^="/cs/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const url = new URL(href, PROJECTS_BASE);
        url.search = '';
        url.hash = '';
        const slug = url.pathname.replace(/^\/cs\/?/, '');
        // A detail slug ends in a reference code such as 261111ACZ or 261120BSK.
        if (!/-\d{6}[A-Z]{3}$/.test(slug)) return;
        urls.add(url.toString());
    });

    return [...urls];
}

export function parseTitansListing(html: string): string[] {
    const $ = cheerio.load(html);
    const urls = new Set<string>();

    $('a[href*="/cs/nabidky-prace/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const url = new URL(href, BASE);
        url.search = '';
        url.hash = '';
        const slug = url.pathname.replace(/^\/cs\/nabidky-prace\/?/, '');
        if (!slug || slug.includes('/')) return;
        urls.add(url.toString());
    });

    return [...urls];
}

/**
 * Parses one Titans detail page using its schema.org JobPosting JSON-LD block.
 * Returns null for offers that are already filled or cannot be read.
 */
export function parseTitansDetail(html: string, url: string): JobOffer | null {
    const $ = cheerio.load(html);

    // Filled offers carry the "Úspěšně obsazen" status. Skip them.
    if ($('body').text().includes('Úspěšně obsazen')) return null;

    let posting: any = null;
    $('script[type="application/ld+json"]').each((_, el) => {
        if (posting) return;
        try {
            const data = JSON.parse($(el).contents().text());
            const top = Array.isArray(data) ? data : [data];
            // The JobPosting sits inside @graph on the live pages, so look one level deeper.
            const list = top.flatMap((entry: any) => (Array.isArray(entry?.['@graph']) ? entry['@graph'] : [entry]));
            posting = list.find((entry: any) => entry?.['@type'] === 'JobPosting') ?? null;
        } catch {
            // Ignore blocks that are not valid JSON.
        }
    });
    if (!posting || !posting.title) return null;

    const location = posting.jobLocation?.address?.addressLocality ?? posting.jobLocation?.addressLocality ?? null;
    // The displayed "Odměna" range is already monthly. The JSON-LD value is a day rate on Join pages.
    const salary = displayedSalary($) ?? formatSalary(posting.baseSalary);
    const company = posting.hiringOrganization?.name ?? null;
    // Titans offers have a reference code (e.g. 261014DCZ) that is stable across runs.
    const reference = posting.identifier?.value ?? url;

    return {
        id: canonicalId(url),
        source: 'titans.cz',
        title: String(posting.title).trim(),
        company: company ? String(company).trim() : null,
        location: location ? String(location).trim() : null,
        salary,
        url: `${url}`,
        query: String(reference),
        scrapedAt: new Date().toISOString(),
    };
}

/**
 * Reads the monthly "Odměna" range shown on the page, e.g. "5 400 € - 6 000 €" or
 * "140 000 Kč - 200 000 Kč", and returns it as "<range> / měsíc".
 */
function displayedSalary($: cheerio.CheerioAPI): string | null {
    const text = $('body').text().replace(/\s+/g, ' ');
    const match = text.match(/Odměna\s+([\d\s]+)\s*(Kč|€)\s*-\s*([\d\s]+)\s*(Kč|€)\s*\/\s*měsíc/);
    if (!match) return null;
    const min = match[1].trim();
    const max = match[3].trim();
    const currency = match[2] === '€' ? 'EUR' : 'CZK';
    return `${min} - ${max} ${currency} / měsíc`;
}

/**
 * Formats the CZK monthly range. The JSON-LD unitText says "DAY", but the page
 * shows the amount per month, so the unit is not read from the JSON-LD.
 */
function formatSalary(baseSalary: any): string | null {
    const value = baseSalary?.value ?? baseSalary;
    const min = value?.minValue;
    const max = value?.maxValue;
    if (!min && !max) return null;
    const currency = value?.currency ?? baseSalary?.currency ?? 'CZK';
    const range = min && max ? `${min} - ${max}` : String(min ?? max);
    return `${range} ${currency} / měsíc`;
}
