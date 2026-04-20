# /prospect analytics

**Trigger:** `/prospect analytics [--days=30]`

## Purpose
Display funnel metrics, email performance, and audit score distribution for the org. Default window is last 30 days.

## Output sections

### Funnel
```
Funnel (last 30 days)
━━━━━━━━━━━━━━━━━━━━
Discovered    → 42
Enriched      → 38  (90%)
Audited       → 31  (74%)
Report Ready  → 28  (67%)
Outreach Sent → 22  (52%)
Opened        → 11  (50% of sent)
Replied       →  3  (14% of sent)
Converted     →  1   (5% of sent)
```

### Email performance by sequence position
```
Position  Sent  Open%  Reply%
Initial     22    50%     9%
Follow-up 1  8    63%    13%
Follow-up 2  4    25%     0%
Follow-up 3  2    50%     0%
Follow-up 4  1     0%     0%
```

### Top 5 P0 findings (across all audits)
```
Finding                                    Count
No local business schema markup               18
Primary CTA below fold on mobile              14
Missing FAQ / AI-accessible content           11
No E-E-A-T author signals                      9
Broken or missing XML sitemap                  7
```

### Score distribution
```
Score range   Prospects
0–40          3  (very poor — strong pitch angle)
40–60        16  (poor — good fit)
60–75         9  (below average)
75–90         3  (decent — harder pitch)
90+           0
```

## Implementation
Queries `AnalyticsEvent` table for funnel events; `Email` + `EmailEvent` for sequence stats; `AuditRecommendation` for P0 finding patterns; `WebsiteAudit.overallScore` for distribution.
