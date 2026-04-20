# /prospect qa

**Trigger:** `/prospect qa [domain]`

## Purpose
Run guardrails validation on all pending generated content for a prospect — outreach emails, report sections, and brief copy. Blocks content that makes unsupported claims or violates quality standards.

## What is checked

### Factual accuracy
- All specific claims in email copy must map to a real finding in `AuditDimensionScore` or `AuditRecommendation`
- Score numbers cited must match stored scores (±0 tolerance)
- Page count, load time, and other measurable claims must be in the `CrawlBundle`

### Tone and compliance
- No false urgency language ("act now", "limited time")
- No claims that imply a competitive audit of another named agency
- Unsubscribe footer present in all HTML emails
- No spam trigger words in subject line (checked against common filter patterns)

### Report quality
- Executive summary must reference at least 2 specific findings (not generic)
- All section narratives must be >= 80 words
- Screenshots must be referenced in context (no orphaned image captions)
- 90-day action plan must have >= 5 distinct action items

## Output
```
QA check: acmeplumbing.com
━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Outreach email: PASSED (4 checks)
✗ Report section: FAILED
  → "Executive summary claims score of 71 but stored score is 62"
  → "Section 4 narrative is 61 words (minimum 80)"
✓ Internal brief: PASSED (3 checks)

Overall: BLOCKED — fix 2 violations before proceeding
```

## Implementation
`qa-guardrails.agent` (Claude Haiku) receives the full content + audit data and returns `{ passed: boolean, violations: string[] }`. If `passed = false`, the workflow run is marked `failed` with the violations list in `errorMessage`.
