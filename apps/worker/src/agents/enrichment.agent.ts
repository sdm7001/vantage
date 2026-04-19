import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { callClaudeJSON, MODELS } from '../lib/claude';

export type EnrichmentResult = {
  companyName?: string;
  industry?: string;
  city?: string;
  description?: string;
  contacts: Array<{
    firstName?: string;
    lastName?: string;
    title?: string;
    email?: string;
    linkedinUrl?: string;
    isPrimary: boolean;
    emailSource: string;
  }>;
  techStack?: string[];
};

export async function runEnrichmentAgent(domain: string): Promise<EnrichmentResult> {
  const url = domain.startsWith('http') ? domain : `https://${domain}`;

  // Crawl about + team pages
  const htmlSnippets = await crawlEnrichmentPages(url);

  // Use Claude Haiku to extract structured data
  const result = await callClaudeJSON<EnrichmentResult>({
    model: MODELS.HAIKU,
    system: `You extract company and contact information from website HTML.
Return only what you can find — do not invent data. Return valid JSON only.`,
    messages: [{
      role: 'user',
      content: `Extract company info and decision-maker contacts from this website content.
Domain: ${domain}

HTML content from about/team pages:
${htmlSnippets.slice(0, 4000)}

Return JSON:
{
  "companyName": "...",
  "industry": "...",
  "city": "...",
  "description": "one sentence company description",
  "contacts": [
    {
      "firstName": "...",
      "lastName": "...",
      "title": "...",
      "email": "... or null",
      "linkedinUrl": "... or null",
      "isPrimary": true/false,
      "emailSource": "found_on_page"
    }
  ],
  "techStack": ["technology names found in HTML/footer"]
}

Rules:
- Only include contacts with clear decision-making titles (CEO, President, Owner, Director, Manager)
- Mark the most senior contact as isPrimary: true
- If no email found, omit it (null)
- Max 3 contacts`,
    }],
    maxTokens: 800,
  });

  return result;
}

async function crawlEnrichmentPages(baseUrl: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const texts: string[] = [];

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; VantageBot/1.0)',
    });

    // Pages to check for team/contact info
    const pagesToCheck = [
      baseUrl,
      `${baseUrl}/about`,
      `${baseUrl}/about-us`,
      `${baseUrl}/team`,
      `${baseUrl}/contact`,
    ];

    for (const pageUrl of pagesToCheck.slice(0, 4)) {
      const page = await context.newPage();
      try {
        const res = await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
        if (!res?.ok()) { await page.close(); continue; }

        const html = await page.content();
        const $ = cheerio.load(html);
        $('script, style, noscript, nav, footer').remove();
        const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 1000);
        if (text.length > 100) texts.push(`[${pageUrl}]\n${text}`);
      } catch {
        // skip pages that fail to load
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return texts.join('\n\n');
}
