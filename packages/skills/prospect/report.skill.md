# /prospect report

**Trigger:** `/prospect report [domain]`

## Purpose
Generate a branded TexMG PDF report from a completed website audit. The report is uploaded to R2 and a shareable public token URL is created. The PDF is also attached or linked in the initial outreach email.

## Guards
- Requires a `WebsiteAudit` with `status = completed` for the domain
- If a `ProspectReport` already exists for this audit, return the existing URL unless `--force` is passed
- QA guardrails run before PDF render — if they fail, generation is blocked with reason

## Steps
1. Load `WebsiteAudit` + all `AuditDimensionScore` + `AuditRecommendation` rows
2. Run `pain-points.agent` → generates `PainPointAnalysis` (primaryPainPoint, outreachAngles[], valueHooks[])
3. Run `report-writer.agent` (Claude Sonnet) → writes each PDF section as structured JSON + markdown:
   - Executive summary, dimension narratives, annotated screenshot captions, recommendations
4. Run `qa-guardrails.agent` → validates all claims against audit data; blocks if `passed = false`
5. Render PDF via Puppeteer (React HTML template → PDF buffer)
6. Upload to R2 at `reports/{orgId}/{prospectId}/{auditId}.pdf`
7. Create `ProspectReport` record with `publicToken`, `pdfKey`, `markdownContent`, `jsonContent`
8. Update `Prospect.status` → `REPORT_READY`

## Output
```
Report generated: acmeplumbing.com
PDF: 12 pages | Score: 62/100
Public URL: https://app.getvantage.io/reports/tok_abc123
R2 key: reports/org_xxx/pro_yyy/aud_zzz.pdf
Outreach angles identified: 3
  1. "No local business schema — missing from all AI search results"
  2. "Primary CTA invisible below the fold on mobile"
  3. "No FAQ content — zero chance of AI Overview citations"
```

## Error handling
- QA failure: surface specific violations, do not generate PDF, mark run as `failed`
- Puppeteer timeout: retry once; if still failing, deliver markdown report as fallback
- R2 upload failure: retry 3×; keep PDF buffer in memory until success
