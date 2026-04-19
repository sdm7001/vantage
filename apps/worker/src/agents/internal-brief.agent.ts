import { callClaude, MODELS } from '../lib/claude';
import type { WeightedScore, PainPointAnalysis } from '@vantage/shared';

export async function runInternalBriefAgent(
  companyName: string,
  domain: string,
  industry: string | undefined,
  contactTitle: string | undefined,
  weightedScore: WeightedScore,
  painPoints: PainPointAnalysis
): Promise<{ markdown: string; appointmentAngle: string }> {
  const markdown = await callClaude({
    model: MODELS.SONNET,
    system: `You write concise, actionable internal sales briefs for the TexMG sales team.
The brief helps the rep understand how to open the conversation and navigate to a 15-minute strategy call.
Be specific about the prospect's situation — no generic fluff. Use markdown headings and bullet points.`,
    messages: [{
      role: 'user',
      content: `Write an internal sales brief for:

**Company:** ${companyName}
**Domain:** ${domain}
**Industry:** ${industry ?? 'unknown'}
**Contact title:** ${contactTitle ?? 'unknown decision maker'}
**Website score:** ${weightedScore.overall}/100

**Category scores:**
${weightedScore.categories.map(c => `- ${c.category}: ${c.score}/100`).join('\n')}

**Primary pain point:** ${painPoints.primaryPainPoint}

**Best outreach angle:** ${painPoints.outreachAngles[0]?.angle ?? 'lead with audit'}
**Hook line:** ${painPoints.outreachAngles[0]?.hookLine ?? 'Your website audit revealed some gaps'}

**Value hooks:**
${painPoints.valueHooks.map(v => `- ${v}`).join('\n')}

Structure the brief with:
## Quick Take
## What We Found (3 bullet points max)
## How to Open the Conversation
## Objection Handling (2 likely objections + responses)
## Appointment Angle (what problem we're solving in the call)`,
    }],
    maxTokens: 1200,
  });

  // Extract appointment angle from brief
  const angleMatch = markdown.match(/## Appointment Angle\s*\n([^\n#]+)/);
  const appointmentAngle = angleMatch?.[1]?.trim() ?? painPoints.outreachAngles[0]?.hookLine ?? '';

  return { markdown, appointmentAngle };
}
