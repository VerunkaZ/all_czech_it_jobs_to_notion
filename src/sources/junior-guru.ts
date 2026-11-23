import * as cheerio from 'cheerio';
import type { JobOffer } from '../types.js';
import { canonicalId } from '../canonical.js';

export const JUNIOR_GURU_URL = 'https://junior.guru/jobs/';

const BASE = 'https://junior.guru';

function absolute(href: string): string {
    return href.startsWith('http') ? href.split('?utm_source')[0] : new URL(href, BASE).toString();
}

/**
 * Parses one page of junior.guru job listings.
 * Each card is `li.jobs-item`; title link in `.jobs-title-link`,
 * company in the first `strong.jobs-info-item`, location in the
 * `.jobs-info-item` that has a geo icon, tags in `.jobs-tag`.
 */
export function parseJuniorGuruListing(html: string): JobOffer[] {
    const $ = cheerio.load(html);
    const offers: JobOffer[] = [];

    $('li.jobs-item').each((_, el) => {
        const item = $(el);
        const link = item.find('a.jobs-title-link').first();
        const href = link.attr('href');
        const title = link.text().trim();
        if (!href || !title) return;

        const url = absolute(href);
        const company = item.find('strong.jobs-info-item').first().text().trim();
        const location = item
            .find('span.jobs-info-item')
            .filter((_, s) => $(s).find('i.bi-geo-alt').length > 0)
            .first()
            .text()
            .trim();

        offers.push({
            id: canonicalId(url),
            source: 'junior.guru',
            title,
            company: company || null,
            location: location || null,
            salary: null,
            url,
            query: '',
            scrapedAt: new Date().toISOString(),
        });
    });

    return offers;
}
