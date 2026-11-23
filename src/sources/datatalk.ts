import * as cheerio from 'cheerio';
import type { JobOffer } from '../types.js';
import { canonicalId } from '../canonical.js';

/**
 * Parser for https://www.datatalk.cz/datajobs/
 *
 * The page is server-rendered. Each company is an <article class="h-feed">
 * with an <h2 class="p-name"> for the company name. Each job is an
 * <li class="h-entry"> with:
 *   - a.p-name.u-url           : job title (href = job link, may include ?utm_source=...)
 *   - .p-location              : location text
 *   - time.dt-published        : posting date text (may be relative, e.g. "Přidáno včera")
 *   - em[itemprop=employmentType] : employment type, optional
 *   - code[itemprop=estimatedSalary] : salary, optional
 *
 * A hidden <template> block at the top holds an empty example card; it is
 * skipped by selecting only articles that are not inside a <template>.
 */
export const DATATALK_URL = 'https://www.datatalk.cz/datajobs/';

function cleanUrl(href: string): string {
  // Remove the tracking suffix the site appends, e.g. "...?utm_source=datatalk.cz"
  // and the "?utm_source=" that follows a query string ("...&source=3?utm_source=...").
  return href.replace(/\?utm_source=datatalk\.cz$/, '').replace(/\?utm_source=datatalk\.cz(?=[&#])/, '');
}

export function parseDatatalkListing(html: string, query: string): JobOffer[] {
  const $ = cheerio.load(html);
  const offers: JobOffer[] = [];

  $('article.h-feed').each((_, article) => {
    // Skip the template card that lives inside <template>.
    const $article = $(article);
    const company = $article.find('> h2.p-name').first().text().trim();

    $article.find('li.h-entry').each((_, li) => {
      const $li = $(li);
      const $link = $li.find('a.p-name.u-url').first();
      const title = $link.text().trim();
      const href = $link.attr('href');
      if (!title || !href) return;

      const url = cleanUrl(href);
      const location = $li.find('.p-location').first().text().trim();
      const salary = $li.find('code[itemprop="estimatedSalary"]').text().replace(/\s+/g, ' ').trim();
      const source = 'datatalk.cz';

      offers.push({
        id: canonicalId(url),
        title,
        company: company || null,
        location: location || null,
        salary: salary || null,
        url,
        source,
        query,
        scrapedAt: new Date().toISOString(),
      });
    });
  });

  return offers;
}

/**
 * Fetches the datatalk page and returns offers whose title, company or
 * location contain the query (case-insensitive). The page lists all current
 * positions in one document, so one fetch serves every query.
 */
export async function runDatatalk(
  fetchHtml: (url: string) => Promise<string>,
  queries: string[],
  maxItems: number,
): Promise<JobOffer[]> {
  const html = await fetchHtml(DATATALK_URL);
  const all: JobOffer[] = [];
  for (const query of queries) {
    const needle = query.toLowerCase();
    const matches = parseDatatalkListing(html, query).filter((o) =>
      [o.title, o.company ?? '', o.location ?? ''].some((v) => v.toLowerCase().includes(needle)),
    );
    all.push(...matches.slice(0, maxItems));
  }
  return all;
}
