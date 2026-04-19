import * as cheerio from 'cheerio';
import { callClaudeJSON, MODELS } from '../../../lib/claude';
import { extractTextFromHtml } from '../../../lib/crawler';
import type { DimensionScore } from '@vantage/shared';

type GeoScoreEntry = { score: number; wins: string[]; criticalFixes: string[] };
type GeoAiResult = {
  scores: Record<string, GeoScoreEntry>;
};

export async function runGeoAiAgent(homepageHtml: string): Promise<DimensionScore[]> {
  const $ = cheerio.load(homepageHtml);

  // Extract schema markup
  const schemaBlocks: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    schemaBlocks.push($(el).html()?.slice(0, 500) ?? '');
  });

  // Check for FAQ sections
  const hasFaq = /faq|frequently asked|questions/i.test(homepageHtml);
  const hasQaPairs = /(<dt|<details|accordion)/i.test(homepageHtml);

  // E-E-A-T signals
  const hasAboutPage = /href="[^"]*about/i.test(homepageHtml);
  const hasTeamPage = /href="[^"]*team|href="[^"]*staff|href="[^"]*people/i.test(homepageHtml);
  const hasTestimonials = /testimonial|review|rating|stars/i.test(homepageHtml);
  const hasAuthorBio = /author|written by|by [A-Z]/i.test(homepageHtml);

  const pageText = extractTextFromHtml(homepageHtml, 3000);
  const wordCount = pageText.split(/\s+/).length;

  const signals = {
    schemaTypes: schemaBlocks.slice(0, 3),
    schemaBlockCount: schemaBlocks.length,
    hasFaqContent: hasFaq,
    hasQAndAPairs: hasQaPairs,
    hasAboutPage,
    hasTeamPage,
    hasTestimonialsOrReviews: hasTestimonials,
    hasAuthorBioOrByline: hasAuthorBio,
    wordCount,
    pageTextSample: pageText.slice(0, 800),
  };

  const result = await callClaudeJSON<GeoAiResult>({
    model: MODELS.HAIKU,
    system: `You are a GEO (Generative Engine Optimization) expert evaluating how well websites
perform in AI-powered search (ChatGPT, Perplexity, Google AI Overviews, Gemini).
Score each dimension 0-10. wins: 1-3 things done well. criticalFixes: 1-3 urgent issues.
Return valid JSON only.`,
    messages: [{
      role: 'user',
      content: `Evaluate this website's AI search readiness:
${JSON.stringify(signals, null, 2)}

Return JSON exactly:
{
  "scores": {
    "entity_clarity": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "faq_qa_content": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "schema_markup_richness": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "eeat_signals": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "ai_readability": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "conversational_query_coverage": { "score": 0-10, "wins": [...], "criticalFixes": [...] }
  }
}`,
    }],
    maxTokens: 1500,
  });

  return (Object.entries(result.scores) as [string, GeoScoreEntry][]).map(([dimension, data]) => ({
    dimension: dimension as never,
    category: 'geo_ai' as const,
    score: Math.min(10, Math.max(0, Math.round(data.score))),
    wins: data.wins || [],
    criticalFixes: data.criticalFixes || [],
  }));
}
