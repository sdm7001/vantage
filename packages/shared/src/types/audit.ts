// Website audit types

export type AuditCategory = 'ux_cro' | 'visual_design' | 'seo' | 'geo_ai' | 'content';

// ── UX/CRO dimensions (weight 20%) ──────────────────────────────────────────
export type UxCroDimension =
  | 'cta_visibility'
  | 'above_fold_clarity'
  | 'mobile_responsiveness'
  | 'form_friction'
  | 'trust_signals'
  | 'load_speed_impact'
  | 'navigation_clarity'
  | 'social_proof_presence';

// ── Visual Design dimensions (weight 15%) ───────────────────────────────────
export type VisualDesignDimension =
  | 'design_modernity'
  | 'visual_hierarchy'
  | 'typography_quality'
  | 'color_palette_professionalism'
  | 'image_quality'
  | 'brand_consistency';

// ── SEO dimensions (weight 20%) ─────────────────────────────────────────────
export type SeoDimension =
  | 'title_meta_optimization'
  | 'heading_structure'
  | 'content_depth'
  | 'technical_seo'
  | 'page_speed_seo'
  | 'local_seo_signals'
  | 'structured_data'
  | 'xml_sitemap_robots'
  | 'internal_linking';

// ── GEO/AI Search dimensions (weight 15%) ───────────────────────────────────
export type GeoAiDimension =
  | 'entity_clarity'
  | 'faq_qa_content'
  | 'schema_markup_richness'
  | 'eeat_signals'
  | 'ai_readability'
  | 'conversational_query_coverage';

// ── Content Analysis dimensions (weight 25%) ────────────────────────────────
export type ContentDimension =
  | 'value_proposition_clarity'
  | 'problem_solution_framing'
  | 'benefit_vs_feature_ratio'
  | 'audience_specificity'
  | 'cta_copy_strength'
  | 'social_proof_quality'
  | 'about_page_credibility';

export type AuditDimension =
  | UxCroDimension
  | VisualDesignDimension
  | SeoDimension
  | GeoAiDimension
  | ContentDimension;

export const CATEGORY_WEIGHTS: Record<AuditCategory, number> = {
  content: 0.25,
  ux_cro: 0.20,
  seo: 0.20,
  visual_design: 0.15,
  geo_ai: 0.15,
};

export type DimensionScore = {
  dimension: AuditDimension;
  category: AuditCategory;
  score: number; // 0-10
  wins: string[];
  criticalFixes: string[];
  notes?: string;
};

export type CategoryScore = {
  category: AuditCategory;
  score: number; // 0-100 (average of dimension scores * 10)
  weight: number;
  dimensions: DimensionScore[];
};

export type WeightedScore = {
  overall: number; // 0-100
  categories: CategoryScore[];
  p0Penalty: number; // up to -5 pts for critical P0 issues
};

export type AuditRecommendation = {
  priority: 'P0' | 'P1' | 'P2';
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  category: AuditCategory;
};

// Raw crawl bundle stored in R2
export type CrawlBundle = {
  domain: string;
  crawledAt: string;
  pages: CrawledPage[];
  screenshot?: string; // base64 or R2 key
  httpHeaders: Record<string, string>;
  robotsTxt?: string;
  sitemapXml?: string;
  psiData?: PageSpeedData;
};

export type CrawledPage = {
  url: string;
  html: string;
  title?: string;
  statusCode: number;
  loadTimeMs?: number;
};

export type PageSpeedData = {
  performanceScore?: number;
  fcpMs?: number;
  lcpMs?: number;
  clsScore?: number;
  inpMs?: number;
  tbtMs?: number;
};
