# /prospect campaign

**Trigger:** `/prospect campaign [name]` or `/prospect campaign --list` or `/prospect campaign --add [domain] --to=[id]`

## Purpose
Create and manage outreach campaigns. Campaigns group prospects and enforce per-campaign daily limits. Each prospect belongs to at most one active campaign.

## Subcommands

### `/prospect campaign [name]`
Create a new campaign:
- Prompts for `name` and `dailyNewLimit` (default 10)
- Creates `Campaign` record with `status = active`
- Output: `Campaign created: "Q2 HVAC Houston" (ID: cam_xxx, cap: 10/day)`

### `/prospect campaign --list`
Show all campaigns for the org:
- Name, status, thread count, active threads, sent/open/reply rates
- Output: formatted table

### `/prospect campaign --add [domain] --to=[campaign-id-or-name]`
Add a prospect to a campaign (creates/updates `OutreachThread.campaignId`):
- Domain must resolve to an existing `Prospect`
- Campaign must be `status = active`
- Thread must not already be in a different active campaign
- Output: `Added acmeplumbing.com → "Q2 HVAC Houston"`

### `/prospect campaign --pause [id]`
Pause a campaign — prevents new `outreach.send.initial` jobs from being enqueued for threads in this campaign.

### `/prospect campaign --archive [id]`
Archive a campaign — immutable after archiving, threads remain in DB.

## Business rules
- `dailyNewLimit` caps NEW initial emails per day across all threads in that campaign
- Follow-up emails bypass campaign cap entirely (separate queue)
- Archived campaigns cannot be reactivated
