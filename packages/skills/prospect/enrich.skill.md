# /prospect enrich

**Trigger:** `/prospect enrich [domain]`

## Purpose
Find and extract decision-maker contacts, company firmographics, and technology stack signals for a prospect. Skips if enrichment was completed within the last 30 days unless `--force` is passed.

## Guards
- Prospect must exist for the given domain
- Skip if `Prospect.status = ENRICHED` and `updatedAt > 30 days ago` (use `--force` to override)

## Steps
1. Enqueue `prospect.enrich` job
2. `enrichment.agent` runs the following in parallel:
   - Crawl `/about`, `/team`, `/contact` pages for contact names and emails
   - Extract technology stack signals (meta generators, script src patterns, favicon hints)
   - Detect business category from page copy
   - Parse `<title>` and meta description for service keywords
3. Store `Contact[]` rows (name, title, email, source, confidence score)
4. Update `Prospect` fields: industry, employeeRange, techStack[], city, state, icpScore
5. Update `Prospect.status` → `ENRICHED`

## Output
```
Enriched: acmeplumbing.com
Contacts found: 2
  → John Smith | Owner | john@acmeplumbing.com (confidence: 0.92)
  → Service Desk | — | service@acmeplumbing.com (confidence: 0.71)
Firmographics:
  Industry: Plumbing Services | Employees: ~5 | City: Houston, TX
Tech stack: WordPress, WooCommerce, Google Analytics
ICP score: 78/100
```

## Fallback
If no contacts found via crawl, set `Contact.source = 'manual'` placeholder and flag for human review in dashboard.
