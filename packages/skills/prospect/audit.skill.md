# /prospect audit

**Trigger:** `/prospect audit [domain]`

## Purpose
Run a full 36-dimension website evaluation on the given domain. Crawls up to 4 pages, captures screenshots and HTTP metadata, then fans out to 5 AI evaluation subagents running in parallel.

## Guards
- Domain must be reachable (HTTP 200 on root)
- Skip if a `WebsiteAudit` with `status = completed` already exists and was created within the last 7 days (add `--force` to override)
- Prospect must already exist in the database; create it first if needed

## Steps
1. Enqueue `audit.crawl` job for the domain → stores `CrawlBundle` JSON + screenshot to R2
2. On crawl completion, enqueue `audit.evaluate` job
3. Evaluation coordinator fans out to all 5 subagents in parallel:
   - `ux-cro.agent` — 8 dimensions, CTA/mobile/form/trust analysis
   - `visual-design.agent` — 6 dimensions, screenshot-based (Claude vision)
   - `seo.agent` — 9 dimensions, meta/schema/speed/local
   - `geo-ai.agent` — 6 dimensions, E-E-A-T/FAQ/structured data
   - `content.agent` — 7 dimensions, messaging/value prop/copy
4. Coordinator synthesizes weighted score (Content 25%, UX 20%, SEO 20%, Design 15%, GEO 15%, P0 penalty up to -5pts)
5. Stores `WebsiteAudit`, `AuditDimensionScore` (36 rows), and `AuditRecommendation` (P0/P1/P2) records
6. Updates `Prospect.status` → `AUDITED`

## Output
```
Audit complete: acmeplumbing.com
Overall score: 62/100
├── Content & Messaging:  58/100 (25%) — 3 P0 issues
├── UX / Conversion:      71/100 (20%) — 1 P0 issue
├── SEO Health:           55/100 (20%) — 2 P0 issues
├── Visual Design:        68/100 (15%)
└── GEO / AI Search:      44/100 (15%) — no FAQ, no schema

P0 Critical (6): [list]
Audit ID: cuid | Duration: 87s
```

## Error handling
- Crawler timeout (>120s): mark audit `status = failed`, log error
- Subagent failure: log error, use score of 0 for that dimension with note "evaluation failed"
- Retry: up to 2 retries on crawl, 2 on evaluate
