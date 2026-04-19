import { runUxCroAgent } from './subagents/ux-cro.agent';
import { runVisualDesignAgent } from './subagents/visual-design.agent';
import { runSeoAgent } from './subagents/seo.agent';
import { runGeoAiAgent } from './subagents/geo-ai.agent';
import { runContentAgent } from './subagents/content.agent';
import type { CrawlBundle, DimensionScore, WeightedScore, AuditCategory, CATEGORY_WEIGHTS } from '@vantage/shared';
import { CATEGORY_WEIGHTS as WEIGHTS } from '@vantage/shared';

export type EvaluationResult = {
  weightedScore: WeightedScore;
  allDimensions: DimensionScore[];
};

export async function runEvaluationCoordinator(bundle: CrawlBundle): Promise<EvaluationResult> {
  const homepage = bundle.pages[0];
  const html = homepage?.html ?? '';

  // Run all 5 subagents in parallel
  const [uxScores, designScores, seoScores, geoScores, contentScores] = await Promise.all([
    runUxCroAgent(html, bundle.screenshot, bundle.psiData).catch(err => {
      console.error('UX/CRO agent failed:', err.message);
      return [] as DimensionScore[];
    }),
    runVisualDesignAgent(html, bundle.screenshot).catch(err => {
      console.error('Visual design agent failed:', err.message);
      return [] as DimensionScore[];
    }),
    runSeoAgent(bundle).catch(err => {
      console.error('SEO agent failed:', err.message);
      return [] as DimensionScore[];
    }),
    runGeoAiAgent(html).catch(err => {
      console.error('GEO/AI agent failed:', err.message);
      return [] as DimensionScore[];
    }),
    runContentAgent(html).catch(err => {
      console.error('Content agent failed:', err.message);
      return [] as DimensionScore[];
    }),
  ]);

  const allDimensions = [...uxScores, ...designScores, ...seoScores, ...geoScores, ...contentScores];

  // Compute weighted overall score
  const byCategory: Record<AuditCategory, DimensionScore[]> = {
    ux_cro: uxScores,
    visual_design: designScores,
    seo: seoScores,
    geo_ai: geoScores,
    content: contentScores,
  };

  let weightedSum = 0;
  const categories = (Object.keys(byCategory) as AuditCategory[]).map(cat => {
    const dims = byCategory[cat];
    const avgScore = dims.length > 0
      ? dims.reduce((sum, d) => sum + d.score, 0) / dims.length
      : 0;
    const scaled = Math.round(avgScore * 10); // 0-100
    weightedSum += scaled * WEIGHTS[cat];

    return {
      category: cat,
      score: scaled,
      weight: WEIGHTS[cat],
      dimensions: dims,
    };
  });

  // P0 penalty: -1 pt for each P0 critical fix dimension (max -5)
  const p0Dims = allDimensions.filter(d => d.score <= 2 && d.criticalFixes.length > 0);
  const p0Penalty = Math.min(5, p0Dims.length);
  const overall = Math.max(0, Math.round(weightedSum) - p0Penalty);

  return {
    weightedScore: { overall, categories, p0Penalty },
    allDimensions,
  };
}
