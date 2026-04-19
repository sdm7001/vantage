import { callClaudeJSON, MODELS } from '../lib/claude';
import type { PainPointAnalysis, WeightedScore, AuditCategory } from '@vantage/shared';

type PainPointResponse = {
  primaryPainPoint: string;
  outreachAngles: Array<{ angle: string; tactic: string; hookLine: string }>;
  valueHooks: string[];
};

export async function runPainPointsAgent(
  companyName: string,
  domain: string,
  industry: string | undefined,
  weightedScore: WeightedScore,
  dimensionNotes: Record<string, { criticalFixes: string[] }>
): Promise<PainPointAnalysis> {
  // Find the 2 worst categories to build the pitch around
  const worstCategories = [...weightedScore.categories]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);

  const criticalFindings = worstCategories
    .flatMap(c => {
      const dims = c.dimensions.slice().sort((a, b) => a.score - b.score).slice(0, 2);
      return dims.flatMap(d => d.criticalFixes.slice(0, 2).map(fix => `[${c.category}] ${fix}`));
    })
    .slice(0, 6);

  const result = await callClaudeJSON<PainPointResponse>({
    model: MODELS.HAIKU,
    system: `You convert website audit findings into compelling B2B sales angles.
Focus on business impact: lost leads, missed revenue, competitive disadvantage.
Write like a trusted advisor, not a salesperson. Return valid JSON only.`,
    messages: [{
      role: 'user',
      content: `Company: ${companyName} (${domain})
Industry: ${industry ?? 'unknown'}
Overall score: ${weightedScore.overall}/100

Worst areas:
${worstCategories.map(c => `${c.category}: ${c.score}/100`).join('\n')}

Critical findings:
${criticalFindings.join('\n')}

Return JSON:
{
  "primaryPainPoint": "one sentence describing the #1 business problem these findings represent",
  "outreachAngles": [
    { "angle": "angle name", "tactic": "how to use this in outreach", "hookLine": "one compelling opening line" },
    { "angle": "...", "tactic": "...", "hookLine": "..." },
    { "angle": "...", "tactic": "...", "hookLine": "..." }
  ],
  "valueHooks": ["specific benefit 1", "specific benefit 2", "specific benefit 3"]
}`,
    }],
    maxTokens: 1000,
  });

  return result;
}
