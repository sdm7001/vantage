# /prospect outreach

**Trigger:** `/prospect outreach [domain] [--approve] [--campaign=id]`

## Purpose
Generate the initial outreach email for a prospect, optionally queue it for sending. The email is personalized from the report's top 2–3 findings. Requires human approval before any email sends unless `--approve` is passed explicitly.

## Guards
- Requires `ProspectReport` with `status = ready`
- Requires at least one `Contact` with `isPrimary = true` and a non-null, non-suppressed email
- Suppression check: contact email and domain must not appear in `SuppressionEntry`
- Thread uniqueness: no existing `OutreachThread` for this prospect (prevents duplicate initial outreach)
- Daily cap check (at send time, not generation time): `DailyEmailLimit.newOutboundSent < dailyNewLimit`

## Steps
1. Load top 2–3 outreach angles from `PainPointAnalysis`
2. Run `outreach-copy.agent` (Claude Sonnet):
   - Inputs: pain points, report summary, sender profile (from `BrandConfig`)
   - Outputs: subject line, HTML body, plain text body
   - Angle: lead with the single most compelling P0 finding; reference the PDF report
3. Create `OutreachThread` (state: `PENDING`) and `Email` (status: `draft`)
4. Show preview to operator for review
5. If `--approve` flag OR manual approval in UI:
   - Inject tracking pixel + unsubscribe footer
   - Enqueue `outreach.send.initial` job
   - Thread transitions: `PENDING` → `APPROVED` → `INITIAL_QUEUED`

## Output
```
Draft created: acmeplumbing.com → john@acmeplumbing.com
Subject: "Found 3 issues on acmeplumbing.com blocking your Google rankings"

[Preview of email body]

Status: PENDING approval
Thread ID: thr_abc123
Run /prospect outreach acmeplumbing.com --approve to queue for sending.
```

## Business rules
- Initial emails: count against org daily cap (max 10/day default, configurable per campaign)
- Business hours only: 9am–5pm recipient timezone (Mon–Fri)
- Never send to suppressed addresses or domains
- PDF report link embedded in email body (public token URL)
