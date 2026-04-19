import { callClaudeJSON, MODELS } from '../lib/claude';
import type { OutreachContext, EmailDraft } from '@vantage/shared';

export async function runOutreachCopyAgent(ctx: OutreachContext): Promise<EmailDraft> {
  const result = await callClaudeJSON<EmailDraft>({
    model: MODELS.SONNET,
    system: `You write cold outreach emails that get replies. Rules:
1. Reference a SPECIFIC finding from the website audit — never generic
2. Lead with the prospect's problem, not your solution
3. 3-4 short paragraphs max
4. Plain, conversational tone — no jargon, no buzzwords
5. One soft CTA: offer to share the full audit report
6. No subject line clickbait. Must feel personal and earned.
Return valid JSON only.`,
    messages: [{
      role: 'user',
      content: `Write a cold outreach email with these specifics:

To: ${ctx.contactFirstName ?? 'there'} ${ctx.contactLastName ?? ''} (${ctx.contactTitle ?? 'decision maker'})
Company: ${ctx.companyName} (${ctx.prospectDomain})
Their website score: ${ctx.overallScore}/100
Primary issue: ${ctx.topPainPoint}
Outreach angle: ${ctx.outreachAngle}
Report URL: ${ctx.reportPublicUrl}
From: ${ctx.senderName}, ${ctx.senderCompany}
Reply-to/booking: ${ctx.bookingUrl ?? ctx.senderEmail ?? 'reply to this email'}

Return JSON:
{
  "subject": "email subject line",
  "htmlBody": "<p>full HTML email body with proper paragraph tags</p>",
  "textBody": "plain text version",
  "fromName": "${ctx.senderName}",
  "fromEmail": "sender email"
}`,
    }],
    maxTokens: 800,
  });

  return {
    ...result,
    fromName: ctx.senderName,
  };
}
