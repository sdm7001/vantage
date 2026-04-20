# /prospect brief

**Trigger:** `/prospect brief [domain]`

## Purpose
Generate an internal sales brief for TexMG team members. The brief summarizes the prospect's business, their key website problems, recommended conversation openers, and suggested service packages. Not sent externally.

## Guards
- Requires `WebsiteAudit` with `status = completed`
- If `InternalBrief` already exists for this audit, return it unless `--force` is passed

## Steps
1. Load `WebsiteAudit` + dimension scores + recommendations + `Prospect` firmographics
2. Run `pain-points.agent` if `PainPointAnalysis` doesn't exist yet
3. Run `internal-brief.agent` (Claude Sonnet):
   - Company summary (what they do, who they serve, where they're located)
   - Score card summary with the 3 most damaging findings
   - Recommended service package (redesign / SEO / GEO / combination)
   - 3 conversation openers tied to specific findings
   - Objection handling suggestions based on industry
   - Competitive context if detectable from site signals
4. Store `InternalBrief` record

## Output
```
Internal Brief: acmeplumbing.com
━━━━━━━━━━━━━━━━━━━━━━━━━━
Company: Acme Plumbing | Houston, TX | Residential + commercial plumbing
Score: 62/100 | High-value ICP match

Top 3 damaging findings:
1. No local schema markup → invisible in "plumber near me" AI Overviews
2. Mobile CTA below fold → 70% of traffic can't find phone number without scrolling
3. No testimonials above fold → lost trust signal for high-ticket jobs

Recommended package: Local SEO + GEO ($1,500/mo) + optional redesign sprint
Conversation openers:
  → "We noticed your site doesn't show up in ChatGPT when someone searches for Houston plumbers..."
  → "Your contact button is the third thing people see on mobile — it should be first..."
  → "You have no reviews on your website even though your Google profile has 47..."

Brief ID: brf_abc123
```
