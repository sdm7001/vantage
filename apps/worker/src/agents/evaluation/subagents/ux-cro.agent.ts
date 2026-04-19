import { callClaudeJSON, MODELS } from '../../../lib/claude';
import { extractTextFromHtml } from '../../../lib/crawler';
import type { DimensionScore, PageSpeedData } from '@vantage/shared';

type ScoreEntry = { score: number; wins: string[]; criticalFixes: string[] };
type UxCroResult = {
  scores: Record<string, ScoreEntry>;
};

export async function runUxCroAgent(
  homepageHtml: string,
  screenshotBase64: string | undefined,
  psiData: PageSpeedData | undefined
): Promise<DimensionScore[]> {
  const text = extractTextFromHtml(homepageHtml, 4000);
  const hasMobileViewport = /<meta[^>]+viewport/i.test(homepageHtml);
  const ctaCount = (homepageHtml.match(/(<button|<a[^>]+btn|call-to-action|cta)/gi) || []).length;
  const formCount = (homepageHtml.match(/<form/gi) || []).length;

  const system = `You are a UX/CRO expert. Analyze websites and score them on 8 conversion optimization dimensions.
Return valid JSON only. Each score is 0-10 (10=excellent, 0=critical failure).
wins: things done well (1-3 items). criticalFixes: urgent improvements (1-3 items).`;

  const prompt = `Analyze this website for UX and conversion optimization.

HTML signals:
- Has mobile viewport meta: ${hasMobileViewport}
- Estimated CTA elements: ${ctaCount}
- Forms found: ${formCount}
${psiData ? `- Performance score: ${psiData.performanceScore}/100
- LCP: ${psiData.lcpMs ? Math.round(psiData.lcpMs) + 'ms' : 'unknown'}
- CLS: ${psiData.clsScore ?? 'unknown'}` : ''}

Page text (first 4000 chars):
${text}

Return JSON exactly:
{
  "scores": {
    "cta_visibility": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "above_fold_clarity": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "mobile_responsiveness": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "form_friction": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "trust_signals": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "load_speed_impact": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "navigation_clarity": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "social_proof_presence": { "score": 0-10, "wins": [...], "criticalFixes": [...] }
  }
}`;

  const result = await callClaudeJSON<UxCroResult>({
    model: MODELS.HAIKU,
    system,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 1500,
  });

  return (Object.entries(result.scores) as [string, ScoreEntry][]).map(([dimension, data]) => ({
    dimension: dimension as never,
    category: 'ux_cro' as const,
    score: Math.min(10, Math.max(0, Math.round(data.score))),
    wins: data.wins || [],
    criticalFixes: data.criticalFixes || [],
  }));
}
