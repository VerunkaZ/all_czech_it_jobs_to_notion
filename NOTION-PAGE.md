# Apify: Czech IT and data job collector

## Status (23 Nov 2026)

- Goal: collect Czech IT and data job offers twice a day into a Notion database.
- Actor: `zpevakova.vero/all-czech-it-jobs-to-notion`, build 0.1.32 (tag latest). Build 0.1.29 is the last Notion-tested build; build 0.1.32 has a Titans-only test (run aKNyhE5OfqUcOWEBG).
- Working live: Jobs.cz (Store Actor shahidirfan/Jobs-cz-Scraper), Profesia.cz (Store Actor unfenced-group/profesia-cz-scraper), junior.guru and datatalk.cz (custom parsers). Both custom parsers are active in the default sources.
- Notion push verified on build 0.1.29: run Qluy1s6zKj7lJLh67 created 8 pages, 0 failed. The token is read from NOTION_TOKEN and the database ID from the notion_database_id environment variable.
- Working live: titans.cz (custom parser). Build 0.1.19 test run zwAYiaY7o2uRTBWO9 returned 5 offers. Build 0.1.32 reads Titans listing pages 1 to 8. Titans is in the default sources.
- Not yet working: join.titans.eu. Parser is in place, but no open project has been returned by a live run.
- Confirmed: the rows from run Qluy1s6zKj7lJLh67 are in the Notion database (checked by the user, 23 Nov 2026).
- Not yet done: the twice-daily schedule. It should stay off until the project is ready.
- Not started: the remaining portals listed in sources-list.md.

## Design

- Reuse Store Actors for Jobs.cz and Profesia.cz instead of writing our own scrapers.
- Write our own parsers for sites with no Czech Store Actor (datatalk.cz, junior.guru, titans.cz, join.titans.eu).
- One shared pipeline: build sources, normalize to one JobOffer shape, dedup, filter by keywords, store, push to Notion.
- The Notion token is a secret and is never pasted into chat. The code reads NOTION_TOKEN from the environment.

## Pipeline steps

1. Build sources: one Jobs.cz search per query, one Profesia run per query, and one fetch each of datatalk.cz, junior.guru, and the Titans listings.
2. Normalize each item to JobOffer (id, source, title, company, location, salary, url, query, scrapedAt).
3. Dedup against SEEN_JOB_IDS in the Actor key-value store (capped at 20,000 ids).
4. Filter with include and exclude keywords on the title. Only the Data and BI group is on by default.
5. Store the results in the dataset and push new offers to Notion.

## Files

- src/main.ts: orchestrator and pipeline
- src/sources.ts: Jobs.cz and Profesia.cz runners
- src/sources/datatalk.ts, src/sources/junior-guru.ts, src/sources/junior-guru-run.ts, src/sources/titans.ts, src/sources/fetch.ts: custom sources
- src/canonical.ts: canonical id per posting
- src/dedup.ts, src/filters.ts, src/notion.ts, src/types.ts
- .actor/: actor.json, input_schema.json, dataset_schema.json, output_schema.json
- README.md, sources-list.md, PROGRESS.md, DOCUMENTATION.md

## Notion setup

1. Create an integration at notion.so/my-integrations and copy the secret token.
2. Create a database with the properties: Name (title), Company, Location, Salary, Source, URL, Query, Scraped.
3. Share the database with the integration (Share menu).
4. Copy the database ID from its URL. The code reads it from the environment variable notion_database_id; the notionDatabaseId input is a fallback. Store the token as the secret environment variable NOTION_TOKEN.

## Open items

- Find an open join.titans.eu project to confirm that parser end to end.
- Check whether the Titans pagination cap (now pages 1 to 8) should go higher, since it changes run time and cost. join.titans.eu lists 120+ pages, so its coverage is partial.
- Add the twice-daily schedule after a successful end-to-end run.
- Work through the remaining portals.
