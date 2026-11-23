# all-czech-it-jobs-to-notion: progress (23 Nov 2026)

## Goal
Collect Czech IT and data job offers twice a day and push new ones to a Notion database.

## Status

| Source | How | Status |
|---|---|---|
| Jobs.cz | Store Actor `shahidirfan/Jobs-cz-Scraper` (replaced `memo23`) | Tested live: 2 to 19 items per run. Company, location and salary often empty |
| Profesia.cz | Store Actor `unfenced-group/profesia-cz-scraper` | Tested live: 1 item in Notion. Zero hits for "bi developer" and "machine learning" on 19 Nov |
| junior.guru | Custom parser `src/sources/junior-guru.ts` | Live in the 19 Nov Notion run (6 rows in the database). Some postings link to other platforms (LinkedIn, profesia.sk) |
| datatalk.cz | Custom parser `src/sources/datatalk.ts` | Live in the 19 Nov Notion run (9 rows in the database) |
| titans.cz | Custom parser `src/sources/titans.ts`, in default `sources` | Live test on build 0.1.19 (run `zwAYiaY7o2uRTBWO9`): 5 offers, all titans.cz, monthly CZK salary. Build 0.1.32 reads listing pages 1 to 8; test run `aKNyhE5OfqUcOWEBG` collected 1 new offer, which did not match the Data and BI filter |
| join.titans.eu | Same parser, projects listing (freelance) | Build 0.1.19 run `zwAYiaY7o2uRTBWO9` returned 0 join.titans.eu items. All 6 projects checked were filled. Open project not yet confirmed |
| Other portals | Not started | See `sources-list.md` |

## Done
- Build 0.1.32 (23 Nov 2026): Titans listing pagination raised from pages 1 to 3 to pages 1 to 8 in `src/sources/titans.ts`. Test run `aKNyhE5OfqUcOWEBG` (Titans only, Data and BI on, Notion off, 5 items): 1 new offer collected, 0 matched the filter.
- Build 0.1.29 (23 Nov 2026): database ID read from env `notion_database_id`. Run `Qluy1s6zKj7lJLh67` created 8 Notion pages, 0 failed.
- Renamed to `all-czech-it-jobs-to-notion` (builds 0.1.26, 0.1.27). `.actor/actor.json` and `package.json` use the new name.
- Build 0.1.21 (22 Nov 2026): Data and BI keyword group expanded in `src/filters.ts`. Test run `45nP7kw7a76fzycZE` on titans.cz: 5 offers collected, 0 matched, as expected for SAP and IT admin titles.
- Build 0.1.19: join.titans.eu salary fixed (monthly range, not the per-day JSON-LD value). `titans.cz` and `join.titans.eu` in the default `sources`.
- titans.cz parser: detail-page JSON-LD `JobPosting` is inside `@graph`; the parser reads it there. Build 0.1.16 succeeded.
- Cross-source dedup via `src/canonical.ts`.
- Keyword filter: 8 user-selectable groups, custom keywords, custom exclude keywords, whole-word title matching.
- Notion code reads the token from `NOTION_TOKEN`.
- Build 0.1.25: Notion push test created 5 pages, 0 failed (run `k6tCJs0vKqQXRDbHo`).
- Notion push verified earlier: run `jnacsTDfQi4BaAqlo` (build 0.1.12, 19 Nov 2026) created 19 pages, 0 failed.
- Build 0.1.4 failed on a TypeScript error (`fetchText` not defined in `src/main.ts`). Fixed in build 0.1.5.

## Not verified yet
- Resolved 23 Nov 2026: the rows from run Qluy1s6zKj7lJLh67 are confirmed in the user's Notion database.
- Run `ISXW2gMxgqfdb4N9E` (19 Nov) skipped Notion because no `notionDatabaseId` was in its input.
- Blank company and location on several Jobs.cz and datatalk rows; duplicates across sources (ACEMA, Mercedes-Benz, FLO).
- Profesia run logged "getProxy is not defined" on the robots.txt check.
- Parser selectors are checked only against saved HTML and could break if the sites change.
- Profesia returns few IT titles per query; recall beyond a small sample is unknown.
- The Notion token was shared in chat earlier; rotate it, then store the new one as `NOTION_TOKEN` in Apify Console only.

## Next steps
1. Run all sources live with 5 items each and check the dataset.
2. Confirm the wider Titans scan (pages 1 to 8) finds offers that match a keyword group. Confirm join.titans.eu produces an open project.
3. Work through the remaining portals in `sources-list.md`.
4. Add the twice-daily schedule after a successful end-to-end run.

## Files
Project: `all-czech-it-jobs-to-notion` (Apify Actor `zpevakova.vero/all-czech-it-jobs-to-notion`)
Portal list: `sources-list.md`
Full documentation: `DOCUMENTATION.md`
