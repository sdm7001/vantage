// Report generation types

export type ReportSection = {
  id: string;
  title: string;
  markdown: string;
  order: number;
};

export type ReportData = {
  prospectId: string;
  auditId: string;
  companyName: string;
  domain: string;
  overallScore: number;
  date: string;

  sections: ReportSection[];

  // Structured content for PDF rendering
  executiveSummary: {
    overallScore: number;
    strengths: string[];
    criticalGaps: string[];
    topOpportunity: string;
  };

  categoryScores: Array<{
    category: string;
    label: string;
    score: number;
    weight: number;
  }>;

  dimensionDetails: Array<{
    category: string;
    dimension: string;
    label: string;
    score: number;
    wins: string[];
    criticalFixes: string[];
  }>;

  recommendations: Array<{
    priority: 'P0' | 'P1' | 'P2';
    title: string;
    description: string;
    effort: string;
    impact: string;
  }>;

  // Brand config snapshot
  brand: {
    companyName: string;
    senderName: string;
    senderEmail: string;
    bookingUrl?: string;
    primaryColor: string;
    accentColor: string;
  };
};

export type PainPointAnalysis = {
  primaryPainPoint: string;
  outreachAngles: OutreachAngle[];
  valueHooks: string[];
};

export type OutreachAngle = {
  angle: string;
  tactic: string;
  hookLine: string;
};
