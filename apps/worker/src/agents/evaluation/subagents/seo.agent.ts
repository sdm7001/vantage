import * as cheerio from 'cheerio';
import { callClaudeJSON, MODELS } from '../../../lib/claude';
import type { DimensionScore, CrawlBundle } from '@vantage/shared';

type SeoScoreEntry = { score: number; wins: string[]; criticalFixes: string[] };
type SeoResult = {
  scores: Record<string, SeoScoreEntry>;
};

export async function runSeoAgent(bundle: CrawlBundle): Promise<DimensionScore[]> {
  const homepage = bundle.pages[0];
  if (!homepage?.html) {
    return buildZeroScores();
  }

  const $ = cheerio.load(homepage.html);

  const title = $('title').text().trim();
  const metaDesc = $('meta[name="description"]').attr('content') ?? '';
  const h1s = $('h1').map((_, el) => $(el).text().trim()).get();
  const h2Count = $('h2').length;
  const canonicalHref = $('link[rel="canonical"]').attr('href') ?? '';
  const hasSchema = /<script[^>]*type="application\/ld\+json"/i.test(homepage.html);
  const hasHreflang = /<link[^>]+hreflang/i.test(homepage.html);
  const imgsMissingAlt = $('img:not([alt])').length;
  const totalImgs = $('img').length;
  const internalLinks = $('a[href^="/"], a[href^="' + bundle.domain + '"]').length;
  const hasRobots = !!bundle.robotsTxt;
  const hasSitemap = !!bundle.sitemapXml;
  const hasHttps = bundle.pages[0].url.startsWith('https://');

  const signals = {
    title: title ? `"${title.slice(0, 80)}" (${title.length} chars)` : 'MISSING',
    metaDescription: metaDesc ? `"${metaDesc.slice(0, 100)}" (${metaDesc.length} chars)` : 'MISSING',
    h1s: h1s.length ? h1s.slice(0, 3).join(' | ') : 'NONE',
    h2Count,
    canonical: canonicalHref || 'none',
    hasSchemaMarkup: hasSchema,
    hasHreflang,
    imgsMissingAlt: `${imgsMissingAlt}/${totalImgs}`,
    internalLinks,
    hasRobotsTxt: hasRobots,
    hasSitemap,
    hasHttps,
    serverHeaders: {
      cacheControl: bundle.httpHeaders['cache-control'] ?? 'none',
      xFrameOptions: bundle.httpHeaders['x-frame-options'] ?? 'none',
    },
    psiPerformance: bundle.psiData?.performanceScore,
  };

  const result = await callClaudeJSON<SeoResult>({
    model: MODELS.HAIKU,
    system: `You are an SEO expert. Score websites on 9 SEO dimensions (0-10 each).
wins: 1-3 things done well. criticalFixes: 1-3 urgent issues. Return valid JSON only.`,
    messages: [{
      role: 'user',
      content: `Evaluate SEO based on these technical signals:
${JSON.stringify(signals, null, 2)}

Return JSON exactly:
{
  "scores": {
    "title_meta_optimization": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "heading_structure": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "content_depth": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "technical_seo": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "page_speed_seo": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "local_seo_signals": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "structured_data": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "xml_sitemap_robots": { "score": 0-10, "wins": [...], "criticalFixes": [...] },
    "internal_linking": { "score": 0-10, "wins": [...], "criticalFixes": [...] }
  }
}`,
    }],
    maxTokens: 1800,
  });

  return (Object.entries(result.scores) as [string, SeoScoreEntry][]).map(([dimension, data]) => ({
    dimension: dimension as never,
    category: 'seo' as const,
    score: Math.min(10, Math.max(0, Math.round(data.score))),
    wins: data.wins || [],
    criticalFixes: data.criticalFixes || [],
  }));
}

function buildZeroScores(): DimensionScore[] {
  const dims = ['title_meta_optimization','heading_structure','content_depth','technical_seo',
    'page_speed_seo','local_seo_signals','structured_data','xml_sitemap_robots','internal_linking'];
  return dims.map(d => ({ dimension: d as never, category: 'seo' as const, score: 0, wins: [], criticalFixes: ['Page could not be crawled'] }));
}
