# /prospect followup

**Trigger:** `/prospect followup [domain]`

## Purpose
Generate and queue the next follow-up email in the sequence for a prospect who has not yet replied. Each follow-up uses a distinct angle. Follow-ups are NOT counted against the 10/day initial outreach cap.

## Guards
- Thread must exist and be in state `INITIAL_SENT` or `FOLLOWUP_N_SENT` (not REPLIED, OPTED_OUT, etc.)
- `nextActionAt` must be <= now (scheduler enforces this automatically)
- No suppression or bounce events on the thread

## Sequence & Angles

| Position | Delay | Angle | Model |
|---|---|---|---|
| Follow-up 1 | Day +3 | New pain point from audit (different from initial email) | Haiku |
| Follow-up 2 | Day +7 | Social proof / case study reference | Haiku |
| Follow-up 3 | Day +14 | Value-add tip (actionable, no direct ask) | Haiku |
| Follow-up 4 | Day +21 | Break-up email, final resource offer | Haiku |

## Steps
1. Load thread + all previous emails + engagement events
2. Determine next sequence position (currentStep + 1)
3. Run `followup-copy.agent` with position-specific system prompt + thread context
4. Create `Email` (status: `draft`), update `OutreachThread.currentStep`
5. Enqueue `outreach.send.followup` job (bypasses daily cap counter)
6. Thread state: `FOLLOWUP_N_QUEUED` → `FOLLOWUP_N_SENT` on delivery

## Scheduler behavior
The `followup-scheduler` cron runs every 15 minutes. It:
- Queries threads due for follow-up (state ends in `_SENT`, `nextActionAt <= now`)
- Generates follow-up copy for each eligible thread
- Enqueues `outreach.send.followup` jobs in batches

## Stop conditions
Any one of: reply received | unsubscribe | hard bounce | spam complaint | manual pause | thread at position 4 (all follow-ups exhausted) → state transitions to `COMPLETED`
