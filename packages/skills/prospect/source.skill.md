# /prospect source

**Trigger:** `/prospect source [--icp=id] [--limit=N]` or `/prospect source --csv=path`

## Purpose
Discover new prospect domains matching the active ICP profile, or import a list from CSV. Deduplicates by domain — never creates a duplicate `Prospect` record.

## ICP-based discovery
1. Load `IcpProfile` (default profile if `--icp` not specified)
2. Run `sourcing.agent` with the ICP fields (industries, cities, states, employee range, keywords)
3. Agent builds search queries and queries DuckDuckGo (or Google CSE if configured)
4. Extracts domains from search results; filters against suppression list and existing prospects
5. Creates `Prospect` records with `status = NEW` for all new domains
6. Caps at `--limit` (default 20 per run)

## CSV import
1. Read CSV; expected columns: `domain` (required), `companyName`, `contactEmail`, `contactName`, `contactTitle`
2. Validate all domains (basic format check)
3. Skip domains already in DB (log count of skips)
4. Create `Prospect` + optional `Contact` records in bulk
5. Report: N imported, M skipped (duplicates), K failed (validation)

## Output
```
Sourced 15 new prospects (ICP: Houston HVAC, 5–50 employees)
  → perfectairhouston.com (score: pending)
  → reliableairco.com (score: pending)
  ... (13 more)
Skipped: 3 (already in DB), 2 (suppressed domains)

Run /prospect enrich [domain] or trigger full pipeline from dashboard.
```

## Guards
- Domain dedup: case-insensitive, strip `www.` prefix before comparison
- No more than 100 prospects created in a single source run
- ICP profile must exist; error if `--icp=id` doesn't match org
