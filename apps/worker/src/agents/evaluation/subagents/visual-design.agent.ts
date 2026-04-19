import Anthropic from '@anthropic-ai/sdk';
import { callClaudeJSON, getClaude, MODELS } from '../../../lib/claude';
import { extractTextFromHtml } from '../../../lib/crawler';
import type { DimensionScore } from '@vantage/shared';

type VisualScoreEntry = { score: number; wins: string[]; criticalFixes: string[] };
type VisualDesignResult = {
  scores: Record<string, VisualScoreEntry>;
};

export async function runVisualDesignAgent(
  homepageHtml: string,
  screenshotBase64: string | undefined
): Promise<DimensionScore[]> {
  const text = extractTextFromHtml(homepageHtml, 2000);

  // Build content array — use vision if screenshot available
  const userContent: Anthropic.MessageParam['content'] = screenshotBase64
    ? [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: screenshotBase64 },
        },
        {
          type: 'text',
          text: buildPrompt(text),
        },
      ]
    : buildPrompt(text);

  const system = `You are a visual design expert specializing in web design quality assessment.
Score each dimension 0-10 (10=excellent). wins: 1-3 things done well. criticalFixes: 1-3 urgent issues.
Return valid JSON only.`;

  let result: VisualDesignResult;

  if (screenshotBase64) {
    const client = getClaude();
    const response = await client.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: userContent }],
    });
    const block = response.content[0];
    if (block.type !== 'text') throw new Error('Unexpected response type');
    const cleaned = block.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    result = JSON.parse(cleaned);
  } else {
    result = await callClaudeJSON<VisualDesignResult>({
      model: MODELS.HAIKU,
      system,
      messages: [{ role: 'user', content: buildPrompt(text) }],
      maxTokens: 1500,
    });
  }

  return (Object.entries(result.scores) as [string, VisualScoreEntry][]).map(([dimension, data]) => ({
    dimension: dimension as never,
    category: 'visual_design' as const,
    score: Math.min(10, Math.max(0, Math.round(data.score))),
    wins: data.wins || [],
    criticalFixes: data.criticalFixes || [],
  }));
}

function buildPrompt(text: string): string {
  return `Evaluate this website's visual design quality.

Page text sample:
${text}

Return JSON exactly:
{
  "scores": {
    "design_modernity": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "visual_hierarchy": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "typography_quality": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "color_palette_professionalism": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "image_quality": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "brand_consistency": { "score": 0-10, "wins": [...], "criticalFixes": [...] }
  }
}`;
}
