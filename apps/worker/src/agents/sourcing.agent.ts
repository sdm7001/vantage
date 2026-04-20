import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '@vantage/config';

const MODEL = 'claude-haiku-4-5-20251001';

export type IcpCriteria = {
  industries: string[];
  cities?: string[];
  states?: string[];
  keywords?: string[];
  minEmployees?: number;
  maxEmployees?: number;
};

export type DiscoveredProspect = {
  domain: string;
  companyName?: string;
  snippet?: string;
  confidence: number; // 0-1 ICP match score
};

export async function runSourcingAgent(
  icp: IcpCriteria,
  limit = 20,
): Promise<DiscoveredProspect[]> {
  const env = getEnv();
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  // Build search queries
  const queries = buildSearchQueries(icp);
  const rawResults: Array<{ domain: string; title: string; snippet: string }> = [];

  // Fetch results for each query (DuckDuckGo Lite — no API key required)
  for (const query of queries.slice(0, 3)) {
    try {
      const results = await fetchDuckDuckGoResults(query);
      rawResults.push(...results);
    } catch (err) {
      console.warn(`[sourcing] DDG query failed: "${query}"`, err);
    }
    await sleep(500); // polite rate limit
  }

  if (rawResults.length === 0) return [];

  // Deduplicate by domain
  const seen = new Set<string>();
  const unique = rawResults.filter(r => {
    if (seen.has(r.domain)) return false;
    seen.add(r.domain);
    return true;
  });

  // Use Claude Haiku to score ICP fit from title + snippet
  const icpDescription = [
    icp.industries.length ? `Industries: ${icp.industries.join(', ')}` : '',
    icp.cities?.length ? `Cities: ${icp.cities.join(', ')}` : '',
    icp.states?.length ? `States: ${icp.states.join(', ')}` : '',
    icp.keywords?.length ? `Keywords: ${icp.keywords.join(', ')}` : '',
    icp.minEmployees ? `Min employees: ${icp.minEmployees}` : '',
    icp.maxEmployees ? `Max employees: ${icp.maxEmployees}` : '',
  ].filter(Boolean).join('\n');

  const candidateList = unique.slice(0, 40).map((r, i) =>
    `${i + 1}. ${r.domain} | ${r.title} | ${r.snippet.slice(0, 120)}`
  ).join('\n');

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are an ICP (ideal customer profile) evaluator. Given a list of businesses and an ICP definition, score each business on how well it fits.

ICP Definition:
${icpDescription}

Businesses to evaluate:
${candidateList}

For each business that fits the ICP with confidence >= 0.5, output one JSON object per line:
{"index": N, "domain": "example.com", "companyName": "Company Name", "confidence": 0.0-1.0}

Skip businesses that clearly don't fit (social media sites, news sites, directories, government sites, personal blogs). Only include genuine businesses matching the ICP.

Output only valid JSON lines, nothing else.`,
    }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  const scored = parseJsonLines(responseText, unique);

  return scored
    .filter(p => p.confidence >= 0.5)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

function buildSearchQueries(icp: IcpCriteria): string[] {
  const queries: string[] = [];
  const locationParts = [
    ...(icp.cities ?? []),
    ...(icp.states ?? []),
  ];

  for (const industry of icp.industries.slice(0, 2)) {
    const location = locationParts.slice(0, 2).join(' ');
    const keyword = icp.keywords?.[0] ?? '';
    const parts = [industry, location, keyword].filter(Boolean);
    queries.push(parts.join(' ') + ' company website');

    if (locationParts.length > 0) {
      queries.push(`${industry} business ${locationParts[0]}`);
    }
  }

  return [...new Set(queries)].slice(0, 6);
}

async function fetchDuckDuckGoResults(
  query: string,
): Promise<Array<{ domain: string; title: string; snippet: string }>> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VantageBot/1.0; research)' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return [];
  const html = await res.text();
  return parseDdgHtml(html);
}

function parseDdgHtml(html: string): Array<{ domain: string; title: string; snippet: string }> {
  const results: Array<{ domain: string; title: string; snippet: string }> = [];

  // Extract result blocks (DuckDuckGo HTML layout)
  const blockRegex = /<div class="result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="result|<\/div>)/g;
  const linkRegex = /href="([^"]+)"/;
  const titleRegex = /<a[^>]*class="result__a"[^>]*>([^<]+)<\/a>/;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/;

  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(html)) !== null && results.length < 30) {
    const block = match[1];
    const titleMatch = titleRegex.exec(block);
    const snippetMatch = snippetRegex.exec(block);
    const linkMatch = linkRegex.exec(block);

    if (!titleMatch || !linkMatch) continue;
    const href = linkMatch[1];

    let domain = '';
    try {
      const hrefUrl = href.startsWith('//') ? `https:${href}` : href;
      const parsed = new URL(hrefUrl);
      domain = parsed.hostname.replace(/^www\./, '');
    } catch {
      continue;
    }

    if (!domain || domain.includes('duckduckgo') || domain.includes('google')) continue;

    results.push({
      domain,
      title: titleMatch[1].replace(/<[^>]+>/g, '').trim(),
      snippet: (snippetMatch?.[1] ?? '').replace(/<[^>]+>/g, '').trim(),
    });
  }

  return results;
}

function parseJsonLines(
  text: string,
  candidates: Array<{ domain: string; title: string; snippet: string }>,
): DiscoveredProspect[] {
  const results: DiscoveredProspect[] = [];
  const lines = text.split('\n').filter(l => l.trim().startsWith('{'));

  for (const line of lines) {
    try {
      const obj = JSON.parse(line) as { index?: number; domain?: string; companyName?: string; confidence?: number };
      const domain = obj.domain ?? candidates[((obj.index ?? 1) - 1)]?.domain;
      if (!domain) continue;
      results.push({
        domain: domain.replace(/^www\./, '').toLowerCase(),
        companyName: obj.companyName,
        snippet: candidates.find(c => c.domain === domain)?.snippet,
        confidence: obj.confidence ?? 0.5,
      });
    } catch {
      // skip malformed lines
    }
  }

  return results;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
