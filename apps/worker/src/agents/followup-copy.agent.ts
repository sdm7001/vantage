import { callClaudeJSON, MODELS } from '../lib/claude';
import type { FollowupContext, EmailDraft } from '@vantage/shared';

function getFollowupAngles(senderCompany: string): Record<number, { name: string; instruction: string }> {
  return {
    1: {
      name: 'new_pain_point',
      instruction: 'Bring up a different finding from the audit that you didn\'t mention in the first email. Keep it brief — 2 short paragraphs.',
    },
    2: {
      name: 'social_proof',
      instruction: `Reference a relevant success story or before/after improvement ${senderCompany} achieved for a similar business. Make it specific — no vague claims.`,
    },
    3: {
      name: 'value_add_tip',
      instruction: 'Share one actionable tip related to their biggest audit gap. Don\'t pitch. Just give value. End with a soft "if you\'d like more like this..." offer.',
    },
    4: {
      name: 'roi_proof',
      instruction: `Share a concrete before/after ROI example — faster load time, better rankings, or more leads — from a comparable business ${senderCompany} helped. Keep it one short paragraph. End with a clear single CTA to book a 15-minute call.`,
    },
    5: {
      name: 'break_up',
      instruction: 'Short break-up email. Acknowledge they\'re busy. Offer one final resource (the audit report link). No hard sell. Close the loop gracefully.',
    },
  };
}

export async function runFollowupCopyAgent(ctx: FollowupContext): Promise<EmailDraft> {
  const angle = getFollowupAngles(ctx.senderCompany)[ctx.sequenceIndex];

  const result = await callClaudeJSON<EmailDraft>({
    model: MODELS.HAIKU,
    system: `You write follow-up emails in a cold outreach sequence. Be brief (under 120 words).
Vary the angle — never repeat the previous email's message. Natural, human tone.
Return valid JSON only.`,
    messages: [{
      role: 'user',
      content: `Write follow-up #${ctx.sequenceIndex} (${angle.name}):

To: ${ctx.contactFirstName ?? 'there'} at ${ctx.companyName}
Previous email subject: "${ctx.previousEmailSubject}"
Sent: ${ctx.previousEmailSentAt}
Opened: ${ctx.threadEngagement.opened ? 'YES' : 'no'}
Clicked: ${ctx.threadEngagement.clicked ? 'YES' : 'no'}

Angle: ${angle.instruction}

Primary pain point (from audit): ${ctx.topPainPoint}
Report URL: ${ctx.reportPublicUrl}
From: ${ctx.senderName}, ${ctx.senderCompany}

Return JSON:
{
  "subject": "RE: previous subject or new subject",
  "htmlBody": "<p>email body</p>",
  "textBody": "plain text",
  "fromName": "${ctx.senderName}",
  "fromEmail": ""
}`,
    }],
    maxTokens: 500,
  });

  return {
    ...result,
    fromName: ctx.senderName,
  };
}
