# all-czech-it-jobs-to-notion: documentation

This document explains the steps taken to build this Actor and the logic behind each part of the code.

The Actor was renamed from `czech-it-data-jobs-notion-v2` to `zpevakova.vero/all-czech-it-jobs-to-notion` (builds 0.1.26 and 0.1.27). The npm name in `package.json` was changed to match.

## Goal

Collect new Czech IT and Data job offers from job boards twice a day, filter them for relevance, and add them to a Notion database so the user can review them quickly.

## Design decisions

1. **Reuse existing Store Actors where they exist.** Jobs.cz (`shahidirfan/Jobs-cz-Scraper`, replacing `memo23/jobscz-scraper`, which failed in test runs) and Profesia.cz (`unfenced-group/profesia-cz-scraper`) have maintained scrapers in the Apify Store. Our Actor calls them as child runs instead of reimplementing their parsing.
2. **Write custom code only for the rest.** The other sites on the list have no dedicated Store Actor. Their scraping code must be written and tested against the live pages, because selectors cannot be verified from memory.
3. **One shared pipeline for all sources.** Every source, whether a child Actor or custom code, produces the same `JobOffer` shape. Deduplication, filtering, and the Notion push run once, on that shape.
4. **Keep the Notion token secret.** The code reads it from the environment variable `NOTION_TOKEN` only. It is not an Actor input. Never write it to code, logs, or the chat.

## Project structure

| File | Purpose |
|---|---|
| `src/main.ts` | Orchestrator: runs the sources, then dedup, filter, dataset, and Notion push |
| `src/sources.ts` | Calls the Store Actors (Jobs.cz via shahidirfan, Profesia.cz) and maps their output to `JobOffer` |
| `src/sources/junior-guru.ts`, `src/sources/junior-guru-run.ts` | junior.guru parser |
| `src/sources/datatalk.ts` | datatalk.cz parser |
| `src/sources/titans.ts` | titans.cz and join.titans.eu parsers |
| `src/sources/fetch.ts` | Shared fetch helper |
| `src/types.ts` | Shared `JobOffer` and `Input` types |
| `src/dedup.ts` | Remembers seen job IDs in a key-value store, so each job is pushed once |
| `src/canonical.ts` | Stable cross-source id for each offer |
| `src/filters.ts` | Keeps offers whose title matches an enabled keyword group or a custom keyword (whole word, case-insensitive), and drops titles containing an exclude keyword |
| `src/notion.ts` | Creates one Notion page per new offer through the Notion REST API |
| `.actor/input_schema.json` | Input form shown in Apify Console |
| `.actor/actor.json` | Actor metadata (name `all-czech-it-jobs-to-notion`) |
| `sources-list.md` | Full list of job portals, with the Store Actor or custom parser for each |
| `test/main.test.ts` | Tests that run against saved HTML, not live sites |

## Logic of each step

### 1. Build the source list (`sources.ts`)

For each search query and each enabled source, the orchestrator prepares one call:

- **Jobs.cz:** each query is passed as `keyword` to `shahidirfan/Jobs-cz-Scraper`, together with `results_wanted` and `collectDetails: true` (needed for company names).
- **Profesia.cz:** the query is passed as `searchQuery` to `unfenced-group/profesia-cz-scraper`, together with `maxItems`.
- **junior.guru, datatalk.cz, titans.cz, join.titans.eu:** custom fetch and parse, no child run.

Each Store Actor call is a child run. The orchestrator waits for it to finish, then reads its default dataset.

### 2. Normalize results

Each source returns its own field names. The code maps them to one shape: `id`, `title`, `company`, `location`, `salary`, `url`, `source`, `query`. Fields a source does not return are left empty rather than guessed.

Jobs.cz location and salary are not returned by the Store Actor, so they stay empty. Company names carry a "Detail pozice |" prefix, which is stripped; placeholder values such as "..." are set to empty. Profesia output was checked live (company, location, salary populated).

### 3. Deduplicate (`dedup.ts`, `canonical.ts`)

Each offer gets a canonical `id`. Jobs.cz postings use `jobs.cz:<number>` from the `/rpd/<number>/` path. titans.cz uses `titans.cz:<reference code>`. Every other URL is used as-is, without its query string, so an offer shared by two sources is counted once. The key-value store keeps the set of IDs already pushed, capped at 20,000 entries. Only IDs not in that set move on to the next step.

### 4. Filter for relevance (`filters.ts`)

An offer is kept when:
- at least one include keyword appears in the title (case-insensitive, whole word), and
- no exclude keyword appears in the title.

Filters are chosen by the user in the input: eight keyword groups (Data and BI, Backend and frontend, QA and testing, DevOps and cloud, Security, IT support, Project and product management, SAP and ERP), each switched on or off, plus free-text custom keywords and exclude keywords. There are no built-in exclude words. Matching is on the title only, so "Senior Data Analyst" passes "Data Analyst" unless the user excludes "senior".

The Data and BI group includes role phrases and tool names: data architect, data platform, data consultant, data specialist, data governance, data quality, analytics engineer, ML engineer, AI engineer, machine learning, DWH, Databricks, Snowflake, BigQuery, SQL. Bare "data" and bare "AI" were left out as too broad for title matching.

### 5. Store and push

- Each kept offer is saved to the Actor's default dataset, so the results can be inspected in Apify Console.
- Each new offer is added to Notion as a new page through `POST /v1/pages`, using the database ID from the input and the token from `NOTION_TOKEN`. If either is missing, the Notion step is skipped and the log says so.

## Notion setup

1. Create an integration at notion.so/my-integrations and copy its secret token.
2. Create a database with these properties (names must match exactly): **Name** (title), **Company** (text), **Location** (text), **Salary** (text), **Source** (text), **URL** (url), **Query** (text), **Scraped** (date).
3. Share the database with the integration: open the database, choose Share, and invite the integration.
4. Copy the database ID from the database URL.
5. Add the token as a secret environment variable named `NOTION_TOKEN` in Apify Console (Actor settings, environment variables), and enter the database ID as a normal input. Do not paste the token in chat.

## Limitations and next steps

- Jobs.cz and Profesia.cz have run live. The Notion push was verified on run `jnacsTDfQi4BaAqlo` (build 0.1.12, 19 Nov 2026): 19 pages created, 0 failed. Run `ISXW2gMxgqfdb4N9E` skipped Notion because its input had no token or database ID.
- junior.guru and datatalk.cz have run live in the 19 Nov run; the database holds 6 and 9 of their rows. Some junior.guru postings link to other platforms (LinkedIn, profesia.sk), which is expected because the site aggregates them.
- Jobs.cz company, location and salary are often empty in the dataset. Several Notion rows are missing company or location, and some postings appear under more than one source (ACEMA, Mercedes-Benz, FLO).
- Profesia returned zero offers for "bi developer" and "machine learning" on 19 Nov, and its robots.txt check logged "getProxy is not defined".
- Build history: 0.1.1 and 0.1.2 failed, 0.1.3 was the first working build, 0.1.4 failed on a TypeScript error (`fetchText` not defined in `src/main.ts`), and 0.1.5 to 0.1.12 succeeded.
- The custom scrapers for the other portals in `sources-list.md` are not built. They need selectors checked against the live pages, one site at a time.
- The schedule (twice a day) is not created yet. It should be added after one successful manual run and a successful Notion test.
- Local tests: run `npm test` in the project folder. The tests use saved HTML, so they do not depend on live sites.

## How to run

1. Copy the project folder locally and run `npm install`.
2. Run `npm test`.
3. Build and run the Actor in Apify Console with a small `maxItemsPerSource` (5 to 10) first, and enable only one or two keyword groups.
4. Check the dataset, then the Notion database.
5. When the output looks right, add the twice-daily schedule.

## titans.cz and join.titans.eu

Two Titans listings are read by `src/sources/titans.ts`, both opt-in through the `sources` input (`titans.cz`, `join.titans.eu`). Both are in the default list since build 0.1.20.

- **titans.cz (job offers):** listing `https://www.titans.cz/cs/nabidky-prace`, then each detail page. The detail page carries a schema.org `JobPosting` JSON-LD block, which sits inside `@graph`. The parser reads title, reference code (`identifier.value`, stable id `titans.cz:<code>`), location and salary. Filled offers ("Úspěšně obsazen") are skipped. Salary is taken from the displayed monthly range; the JSON-LD unit is per day and is not used.
- **join.titans.eu (freelance projects):** listing `https://join.titans.eu/cs?text=`, detail pages at `join.titans.eu/cs/<slug>-<refcode>`. The displayed salary is monthly (for example 140 000 to 160 000 Kč, or EUR); the JSON-LD `baseSalary` is per man-day and would give the wrong figure, so the monthly text is used instead (build 0.1.19).

**Test results**

- Build 0.1.16, run `wk4DgvTQ50P1HgjMu` (titans.cz, 5 items): 5 offers after the `@graph` fix.
- Build 0.1.18, run `REyiwQy28tXdQs9hL` (titans.cz and join.titans.eu, Data and BI filter off, 5 items): 5 titans.cz offers, 0 join.titans.eu offers.
- Build 0.1.19, run `zwAYiaY7o2uRTBWO9` (both sources, Notion off, 5 items): dataset `tSof9h3EnkTUe96PE`, 5 titans.cz offers with monthly CZK salaries, 0 join.titans.eu offers.
- Checked by hand (22 Nov): 6 of the 25 join.titans.eu projects on the first listing page, all marked filled. No open project has been seen yet, so it is not confirmed that the parser handles an open one.

**Known gaps**

- Pagination reads listing pages 1 to 8 (`runTitans`, build 0.1.32). Titans lists 8 or more pages, so the cap of 8 covers most of its listing. join.titans.eu lists 120+ pages, so only the first 8 are read for it too. Coverage beyond page 8 is not implemented.
- The titans.cz company is always "TITANS"; the end client is not named on the page.
- The Data and BI group is on by default in the input schema and filters out Titans offers that do not contain its keywords. Test runs turn it off.

**Build history (since 0.1.12)**

- 0.1.13: SUCCEEDED (21 Nov 2026).
- 0.1.14: FAILED. TypeScript errors: `parseTitansListing` and `parseTitansDetail` were declared twice in `src/sources/titans.ts`.
- 0.1.15: SUCCEEDED, after removing the duplicate functions.
- 0.1.16: SUCCEEDED, after reading JobPosting from `@graph`. First working Titans test.
- 0.1.17: not used.
- 0.1.18: SUCCEEDED, with join.titans.eu added as a listing source.
- 0.1.19: SUCCEEDED, with monthly salary parsing for join.titans.eu.
- 0.1.20: SUCCEEDED, with `titans.cz` and `join.titans.eu` in the default `sources` list.
- 0.1.21: SUCCEEDED (22 Nov 2026). Data and BI keyword group expanded (see step 4 above). Test run `45nP7kw7a76fzycZE` on titans.cz (Data and BI on, Notion off, 5 items): 5 offers collected, 0 matched, dataset `mksUqr4L99yqDhqch` empty. The five offers were SAP and IT administration roles with no data-role title, so zero matches is expected for that sample. The new terms are not yet tested against a data-titled offer.
- 0.1.22 to 0.1.24: intermediate builds during the Notion token work (22 Nov 2026).
- 0.1.23: used for the Notion test runs below.
- 0.1.25: SUCCEEDED (22 Nov 2026), Notion push tested (see below).
- 0.1.26 and 0.1.27: rename builds. - 0.1.27 SUCCEEDED (23 Nov 2026) with the Actor name `all-czech-it-jobs-to-notion`.
- 0.1.28 SUCCEEDED (23 Nov 2026): rebuild after the docs update.
- 0.1.29 SUCCEEDED (23 Nov 2026): Notion database ID read from env `notion_database_id`. Run `Qluy1s6zKj7lJLh67` created 8 Notion pages, 0 failed.
- 0.1.30: comment fix in `src/main.ts` (datatalk.cz and junior.guru are active; the runner files exist).
- 0.1.31: SUCCEEDED (23 Nov 2026). Source not reviewed in this session; the build log confirms the image was pushed.
- 0.1.32: SUCCEEDED (23 Nov 2026), built from source revision `866e8bc084102735` with Titans pagination at pages 1 to 8. Test run `aKNyhE5OfqUcOWEBG` (Titans sources only, Data and BI on, Notion off, 5 items): 1 offer collected, 1 new, 0 matched the filter. The log shows Notion already held 74 offer URLs. Pages read per listing are not logged, so the effect of the wider scan is not measured yet.

**Notion test runs (22 Nov 2026, titans.cz only, 5 items)**

- Run `Vz558sB9CoFqDJXMr` (build 0.1.23, database ID passed as input): SUCCEEDED, but the log says "No notionToken/notionDatabaseId in input, skipping Notion sync." No Notion write.
- Run `kObjgtzwMujN89QYp` (build 0.1.23, after renaming the token variable to `NOTION_TOKEN`): SUCCEEDED, same skip message. Cause: the token was not reaching the run.
- Build 0.1.25 run `k6tCJs0vKqQXRDbHo` SUCCEEDED. Log: "Notion already holds 45 offer URLs; these are skipped." and "Notion: created 5 pages, 0 failed". The 45 URLs were read from the database, so earlier runs wrote there.
- Open question: the user did not see the new offers in the Notion database after the earlier runs. The database ID used is `e8707fbb-85f2-8322-a910-018e90aa45ec`. The cause is not confirmed (a filter or view in Notion, or a different database). The 5 offers in run `k6tCJs0vKqQXRDbHo` were still counted as new, so the URL skip may not match what Notion stores.

## Sources added (17 Nov 2026, status updated 20 Nov 2026)

- **junior.guru** (`src/sources/junior-guru.ts`): parses `https://junior.guru/jobs/`. Each card is `li.jobs-item`; the title link is `a.jobs-title-link`, the company is the first `strong.jobs-info-item`, and the location is the `.jobs-info-item` with a geo icon. The page aggregates Jobs.cz postings, so it overlaps with the Jobs.cz Store Actor.
- **datatalk.cz** (`src/sources/datatalk.ts`): parses `https://www.datatalk.cz/datajobs/`. The page is server-rendered; companies are `article.h-feed` and jobs are `li.h-entry`. One fetch serves every query, filtered by title, company, and location.

## Testing

Parsers were checked against saved HTML (`datatalk.html`, `junior.html`): datatalk gives 42 offers, junior.guru gives 268, with no duplicate ids within either page.
