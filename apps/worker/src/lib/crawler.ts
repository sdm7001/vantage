import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { getEnv } from '@vantage/config';
import type { CrawlBundle, CrawledPage, PageSpeedData } from '@vantage/shared';

const MAX_PAGES = 4;
const PAGE_TIMEOUT = 30_000;

export async function crawlDomain(domain: string): Promise<CrawlBundle> {
  const url = domain.startsWith('http') ? domain : `https://${domain}`;
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; VantageBot/1.0; +https://vantage.texmg.com/bot)',
      viewport: { width: 1280, height: 800 },
    });

    const pages: CrawledPage[] = [];
    let screenshot: string | undefined;
    let robotsTxt: string | undefined;
    let sitemapXml: string | undefined;
    let httpHeaders: Record<string, string> = {};

    // Crawl homepage + up to 3 internal pages
    const urlsToCrawl = [url];
    const crawledUrls = new Set<string>();

    for (let crawlIdx = 0; crawlIdx < urlsToCrawl.length && crawlIdx < MAX_PAGES; crawlIdx++) {
      const pageUrl = urlsToCrawl[crawlIdx];
      if (crawledUrls.has(pageUrl)) continue;
      crawledUrls.add(pageUrl);

      const page = await context.newPage();
      try {
        const start = Date.now();
        const response = await page.goto(pageUrl, {
          waitUntil: 'domcontentloaded',
          timeout: PAGE_TIMEOUT,
        });

        const loadTimeMs = Date.now() - start;
        const statusCode = response?.status() ?? 0;
        const html = await page.content();

        if (pageUrl === url) {
          // Capture homepage screenshot as base64
          const screenshotBuffer = await page.screenshot({ fullPage: false });
          screenshot = screenshotBuffer.toString('base64');

          // Capture response headers
          httpHeaders = Object.fromEntries(
            Object.entries(response?.headers() ?? {}).map(([k, v]) => [k.toLowerCase(), v])
          );

          // Discover internal links for further crawling
          const $ = cheerio.load(html);
          const baseDomain = new URL(url).hostname;
          $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            if (!href) return;
            try {
              const resolved = new URL(href, url);
              if (
                resolved.hostname === baseDomain &&
                !crawledUrls.has(resolved.href) &&
                urlsToCrawl.length < MAX_PAGES
              ) {
                urlsToCrawl.push(resolved.href);
              }
            } catch {
              // invalid URL, skip
            }
          });
        }

        pages.push({ url: pageUrl, html, statusCode, loadTimeMs });
      } catch (err) {
        pages.push({ url: pageUrl, html: '', statusCode: 0, loadTimeMs: 0 });
      } finally {
        await page.close();
      }
    }

    // Fetch robots.txt and sitemap
    try {
      const robotsPage = await context.newPage();
      const res = await robotsPage.goto(`${url}/robots.txt`, { timeout: 10_000 });
      if (res?.ok()) robotsTxt = await robotsPage.innerText('body');
      await robotsPage.close();
    } catch { /* ignore */ }

    try {
      const sitemapPage = await context.newPage();
      const res = await sitemapPage.goto(`${url}/sitemap.xml`, { timeout: 10_000 });
      if (res?.ok()) sitemapXml = await sitemapPage.content();
      await sitemapPage.close();
    } catch { /* ignore */ }

    // Optional: PageSpeed Insights API
    let psiData: PageSpeedData | undefined;
    const env = getEnv();
    if (env.PSI_API_KEY) {
      try {
        psiData = await fetchPSI(url, env.PSI_API_KEY);
      } catch { /* non-fatal */ }
    }

    return {
      domain,
      crawledAt: new Date().toISOString(),
      pages,
      screenshot,
      httpHeaders,
      robotsTxt,
      sitemapXml,
      psiData,
    };
  } finally {
    await browser.close();
  }
}

async function fetchPSI(url: string, apiKey: string): Promise<PageSpeedData> {
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${apiKey}`;
  const res = await fetch(endpoint, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`PSI API error: ${res.status}`);
  const json = await res.json() as Record<string, unknown>;
  const cats = (json.lighthouseResult as Record<string, unknown>)?.categories as Record<string, { score: number }> | undefined;
  const audits = (json.lighthouseResult as Record<string, unknown>)?.audits as Record<string, { numericValue?: number }> | undefined;

  return {
    performanceScore: cats?.performance?.score != null ? Math.round(cats.performance.score * 100) : undefined,
    fcpMs: audits?.['first-contentful-paint']?.numericValue,
    lcpMs: audits?.['largest-contentful-paint']?.numericValue,
    clsScore: audits?.['cumulative-layout-shift']?.numericValue,
    inpMs: audits?.['interaction-to-next-paint']?.numericValue,
    tbtMs: audits?.['total-blocking-time']?.numericValue,
  };
}

export function extractTextFromHtml(html: string, maxChars = 8000): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg, img, video, audio, iframe, head').remove();
  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, maxChars);
}
