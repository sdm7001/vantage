import { callClaudeJSON, MODELS } from '../../../lib/claude';
import { extractTextFromHtml } from '../../../lib/crawler';
import type { DimensionScore } from '@vantage/shared';

type ContentScoreEntry = { score: number; wins: string[]; criticalFixes: string[]; copyRewrite?: string };
type ContentResult = {
  scores: Record<string, ContentScoreEntry>;
};

export async function runContentAgent(homepageHtml: string): Promise<DimensionScore[]> {
  const text = extractTextFromHtml(homepageHtml, 5000);

  const result = await callClaudeJSON<ContentResult>({
    model: MODELS.HAIKU,
    system: `You are a B2B content strategist and copywriter. Analyze website content for
conversion effectiveness and messaging clarity. Score each dimension 0-10.
wins: 1-3 things done well. criticalFixes: 1-3 urgent improvements. Return valid JSON only.`,
    messages: [{
      role: 'user',
      content: `Analyze this website's content and messaging:

PAGE TEXT:
${text}

Score on 7 content dimensions. For "value_proposition_clarity", include a brief suggested rewrite in copyRewrite.

Return JSON exactly:
{
  "scores": {
    "value_proposition_clarity": { "score": 0-10, "wins": [...], "criticalFixes": [...], "copyRewrite": "suggested headline..." },
    "problem_solution_framing": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "benefit_vs_feature_ratio": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "audience_specificity": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "cta_copy_strength": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "social_proof_quality": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "about_page_credibility": { "score": 0-10, "wins": [...], "criticalFixes": [...] }
  }
}`,
    }],
    maxTokens: 2000,
  });

  return (Object.entries(result.scores) as [string, ContentScoreEntry][]).map(([dimension, data]) => ({
    dimension: dimension as never,
    category: 'content' as const,
    score: Math.min(10, Math.max(0, Math.round(data.score))),
    wins: data.wins || [],
    criticalFixes: data.criticalFixes || [],
    notes: data.copyRewrite,
  }));
}
