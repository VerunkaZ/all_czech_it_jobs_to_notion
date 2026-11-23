/**
 * One stable key per posting, shared by every source.
 *
 * Jobs.cz postings are identified by the number in /rpd/<number>/. Aggregators
 * such as junior.guru link to the same postings, so their URLs map to the same
 * key and the duplicate is dropped by id.
 */
export function canonicalId(url: string): string {
    const jobsCz = url.match(/jobs\.cz\/rpd\/(\d+)/);
    if (jobsCz) return `jobs.cz:${jobsCz[1]}`;
    return url.split('?')[0];
}
