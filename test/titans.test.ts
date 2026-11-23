import { describe, it, expect } from 'vitest';
import { parseTitansDetail, parseTitansListing } from '../src/sources/titans.js';

const DETAIL_URL = 'https://www.titans.cz/cs/nabidky-prace/it-business-analyst-261014DCZ';

// Minimal saved detail page: the JSON-LD JobPosting block as served on titans.cz.
const DETAIL_HTML = `<html><head><script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: 'IT Business Analyst',
    identifier: { '@type': 'PropertyValue', value: '261014DCZ' },
    datePosted: '2026-10-14 12:29:55',
    jobLocation: { '@type': 'Place', address: { addressLocality: 'Prague' } },
    baseSalary: { '@type': 'MonetaryAmount', currency: 'CZK', value: { minValue: 100000, maxValue: 120000, unitText: 'DAY' } },
    hiringOrganization: { '@type': 'Organization', name: 'TITANS' },
})}</script></head><body></body></html>`;

const LISTING_HTML = `<html><body>
    <a href="/cs/nabidky-prace">all</a>
    <a href="/cs/nabidky-prace/it-business-analyst-261014DCZ">IT BA</a>
    <a href="/cs/nabidky-prace/it-business-analyst-261014DCZ?utm=x">IT BA dup</a>
    <a href="/cs/nabidky-prace/devops-engineer-251107FCZ">DevOps</a>
    <a href="/cs/nabidky-prace?pagenum=2">page 2</a>
</body></html>`;

describe('titans.cz detail parser', () => {
    it('reads title, reference ID, location, company and monthly salary from JSON-LD', () => {
        const offer = parseTitansDetail(DETAIL_HTML, DETAIL_URL);
        expect(offer).not.toBeNull();
        expect(offer?.title).toBe('IT Business Analyst');
        expect(offer?.id).toBe('titans.cz:261014DCZ');
        expect(offer?.source).toBe('titans.cz');
        expect(offer?.location).toBe('Prague');
        expect(offer?.company).toBe('TITANS');
        expect(offer?.salary).toContain('/ měsíc');
        expect(offer?.url).toBe(DETAIL_URL);
    });

    it('drops offers marked as already filled', () => {
        const filled = DETAIL_HTML.replace('</body>', '<p>Úspěšně obsazen</p></body>');
        expect(parseTitansDetail(filled, DETAIL_URL)).toBeNull();
    });

    it('returns null when there is no JobPosting block', () => {
        expect(parseTitansDetail('<html><body>no data</body></html>', DETAIL_URL)).toBeNull();
    });
});

describe('titans.cz listing parser', () => {
    it('collects unique detail URLs and skips listing and pagination links', () => {
        const urls = parseTitansListing(LISTING_HTML);
        expect(urls).toEqual([
            'https://www.titans.cz/cs/nabidky-prace/it-business-analyst-261014DCZ',
            'https://www.titans.cz/cs/nabidky-prace/devops-engineer-251107FCZ',
        ]);
    });
});
