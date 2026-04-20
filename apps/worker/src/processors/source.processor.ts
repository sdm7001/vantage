import { prisma } from '@vantage/database';
import type { ProspectSourceJobData } from '@vantage/queue';
import { runSourcingAgent } from '../agents/sourcing.agent';

export async function sourceProcessor(data: ProspectSourceJobData) {
  const { orgId, icpProfileId, limit } = data;

  const profile = await prisma.icpProfile.findFirst({
    where: { id: icpProfileId, orgId },
  });
  if (!profile) throw new Error(`ICP profile ${icpProfileId} not found`);

  const discovered = await runSourcingAgent({
    industries: profile.industries as string[],
    cities: profile.cities as string[],
    states: profile.states as string[],
    keywords: profile.keywords as string[],
    minEmployees: profile.minEmployees ?? undefined,
    maxEmployees: profile.maxEmployees ?? undefined,
  }, limit);

  // Get existing domains and suppressions for dedup
  const [existing, suppressions] = await Promise.all([
    prisma.prospect.findMany({ where: { orgId }, select: { domain: true } }),
    prisma.suppressionEntry.findMany({ where: { orgId, type: 'DOMAIN' }, select: { value: true } }),
  ]);
  const existingDomains = new Set(existing.map((p: { domain: string }) => p.domain));
  const suppressedDomains = new Set(suppressions.map((s: { value: string }) => s.value));

  let added = 0;
  for (const d of discovered) {
    if (existingDomains.has(d.domain) || suppressedDomains.has(d.domain)) continue;
    try {
      await prisma.prospect.create({
        data: {
          orgId,
          domain: d.domain,
          companyName: d.companyName ?? null,
          industry: (profile.industries as string[])[0] ?? null,
          icpScore: Math.round(d.confidence * 100),
          status: 'NEW',
          sourceType: 'sourcing_agent',
        },
      });
      existingDomains.add(d.domain);
      added++;
    } catch {
      // skip duplicates or constraint violations
    }
  }

  console.log(`[source] Added ${added}/${discovered.length} prospects for ICP profile ${icpProfileId}`);
}
