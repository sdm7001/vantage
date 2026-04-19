import { callClaude, MODELS } from '../lib/claude';
import type { WeightedScore, DimensionScore, PainPointAnalysis, ReportData } from '@vantage/shared';

type BrandConfig = {
  companyName: string;
  senderName: string;
  senderEmail: string;
  bookingUrl?: string | null;
  primaryColor: string;
  accentColor: string;
};

export async function runReportWriterAgent(
  companyName: string,
  domain: string,
  weightedScore: WeightedScore,
  allDimensions: DimensionScore[],
  painPoints: PainPointAnalysis,
  brand: BrandConfig
): Promise<ReportData> {
  // Write narrative sections using Sonnet
  const [execSummary, contentSection, seoSection, geoSection, uxSection, recommendations] = await Promise.all([
    writeSection('executive_summary', companyName, domain, weightedScore, allDimensions, painPoints),
    writeSection('content_analysis', companyName, domain, weightedScore, allDimensions, painPoints),
    writeSection('seo_health', companyName, domain, weightedScore, allDimensions, painPoints),
    writeSection('geo_ai_readiness', companyName, domain, weightedScore, allDimensions, painPoints),
    writeSection('ux_conversion', companyName, domain, weightedScore, allDimensions, painPoints),
    writeSection('recommendations', companyName, domain, weightedScore, allDimensions, painPoints),
  ]);

  const worstCategories = [...weightedScore.categories]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(c => c.category.replace(/_/g, ' '));

  const bestCategories = [...weightedScore.categories]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(c => c.category.replace(/_/g, ' '));

  return {
    prospectId: '',
    auditId: '',
    companyName,
    domain,
    overallScore: weightedScore.overall,
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),

    sections: [
      { id: 'exec_summary', title: 'Executive Summary', markdown: execSummary, order: 1 },
      { id: 'ux_conversion', title: 'UX & Conversion', markdown: uxSection, order: 2 },
      { id: 'content_analysis', title: 'Content & Messaging', markdown: contentSection, order: 3 },
      { id: 'seo_health', title: 'SEO Health', markdown: seoSection, order: 4 },
      { id: 'geo_ai', title: 'AI Search Readiness', markdown: geoSection, order: 5 },
      { id: 'recommendations', title: 'Priority Recommendations', markdown: recommendations, order: 6 },
    ],

    executiveSummary: {
      overallScore: weightedScore.overall,
      strengths: bestCategories,
      criticalGaps: worstCategories,
      topOpportunity: painPoints.outreachAngles[0]?.hookLine ?? painPoints.primaryPainPoint,
    },

    categoryScores: weightedScore.categories.map(c => ({
      category: c.category,
      label: c.category.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()),
      score: c.score,
      weight: c.weight,
    })),

    dimensionDetails: allDimensions.map(d => ({
      category: d.category,
      dimension: d.dimension,
      label: String(d.dimension).replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()),
      score: d.score,
      wins: d.wins,
      criticalFixes: d.criticalFixes,
    })),

    recommendations: buildRecommendations(weightedScore, allDimensions),

    brand: {
      companyName: brand.companyName,
      senderName: brand.senderName,
      senderEmail: brand.senderEmail,
      bookingUrl: brand.bookingUrl ?? undefined,
      primaryColor: brand.primaryColor,
      accentColor: brand.accentColor,
    },
  };
}

async function writeSection(
  section: string,
  companyName: string,
  domain: string,
  weightedScore: WeightedScore,
  allDimensions: DimensionScore[],
  painPoints: PainPointAnalysis
): Promise<string> {
  const cat = section === 'content_analysis' ? 'content'
    : section === 'seo_health' ? 'seo'
    : section === 'geo_ai_readiness' ? 'geo_ai'
    : section === 'ux_conversion' ? 'ux_cro'
    : null;

  const relevantDims = cat
    ? allDimensions.filter(d => d.category === cat)
    : allDimensions;

  const dimSummary = relevantDims.slice(0, 6).map(d =>
    `${d.dimension} (${d.score}/10): fixes=${d.criticalFixes.slice(0, 1).join('; ')}`
  ).join('\n');

  return callClaude({
    model: MODELS.SONNET,
    system: 'You write professional website audit reports. Be specific, evidence-based, and actionable. 150-250 words per section. No fluff.',
    messages: [{
      role: 'user',
      content: `Write the "${section.replace(/_/g, ' ')}" section for ${companyName}'s (${domain}) audit report.
Overall score: ${weightedScore.overall}/100.
Primary business issue: ${painPoints.primaryPainPoint}

Relevant findings:
${dimSummary || 'No specific findings for this section.'}

Write 150-250 words. Be specific about this company's actual situation. Professional but readable tone.`,
    }],
    maxTokens: 400,
  });
}

function buildRecommendations(
  weightedScore: WeightedScore,
  allDimensions: DimensionScore[]
): ReportData['recommendations'] {
  const recs: ReportData['recommendations'] = [];

  // P0: score 0-2
  allDimensions
    .filter(d => d.score <= 2)
    .slice(0, 3)
    .forEach(d => recs.push({
      priority: 'P0',
      title: `Fix ${String(d.dimension).replace(/_/g, ' ')}`,
      description: d.criticalFixes[0] ?? 'Critical issue requiring immediate attention',
      effort: 'medium',
      impact: 'high',
    }));

  // P1: score 3-5
  allDimensions
    .filter(d => d.score >= 3 && d.score <= 5)
    .slice(0, 4)
    .forEach(d => recs.push({
      priority: 'P1',
      title: `Improve ${String(d.dimension).replace(/_/g, ' ')}`,
      description: d.criticalFixes[0] ?? 'Significant improvement opportunity',
      effort: 'medium',
      impact: 'medium',
    }));

  // P2: score 6-7
  allDimensions
    .filter(d => d.score >= 6 && d.score <= 7)
    .slice(0, 3)
    .forEach(d => recs.push({
      priority: 'P2',
      title: `Enhance ${String(d.dimension).replace(/_/g, ' ')}`,
      description: d.wins[0] ? `Currently decent: ${d.wins[0]}. Next level: ${d.criticalFixes[0] ?? 'polish'}` : 'Enhancement opportunity',
      effort: 'low',
      impact: 'low',
    }));

  return recs;
}
