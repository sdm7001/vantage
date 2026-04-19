import { prisma } from '@vantage/database';
import type { ProspectEnrichJobData } from '@vantage/queue';
import { runEnrichmentAgent } from '../agents/enrichment.agent';

export async function enrichProcessor(data: ProspectEnrichJobData): Promise<void> {
  const { prospectId } = data;

  await prisma.prospect.update({
    where: { id: prospectId },
    data: { status: 'ENRICHING' },
  });

  const prospect = await prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } });

  let result;
  try {
    result = await runEnrichmentAgent(prospect.domain);
  } catch (err) {
    // Non-fatal — continue without enrichment
    console.warn(`Enrichment failed for ${prospect.domain}:`, err instanceof Error ? err.message : String(err));
    await prisma.prospect.update({ where: { id: prospectId }, data: { status: 'ENRICHED' } });
    return;
  }

  // Update prospect with found company info
  await prisma.prospect.update({
    where: { id: prospectId },
    data: {
      companyName: result.companyName ?? prospect.companyName,
      industry: result.industry ?? prospect.industry,
      city: result.city ?? prospect.city,
      status: 'ENRICHED',
      updatedAt: new Date(),
    },
  });

  // Upsert contacts found
  for (const contact of result.contacts ?? []) {
    const existing = contact.email
      ? await prisma.contact.findFirst({ where: { prospectId, email: contact.email } })
      : null;

    if (existing) continue;

    await prisma.contact.create({
      data: {
        prospectId,
        firstName: contact.firstName ?? null,
        lastName: contact.lastName ?? null,
        title: contact.title ?? null,
        email: contact.email ?? null,
        linkedinUrl: contact.linkedinUrl ?? null,
        isPrimary: contact.isPrimary,
        emailSource: contact.emailSource ?? 'enriched',
        emailVerified: false,
      },
    });
  }

  // Ensure exactly one primary contact
  const contacts = await prisma.contact.findMany({ where: { prospectId } });
  if (contacts.length > 0 && !contacts.some((c: { isPrimary: boolean }) => c.isPrimary)) {
    await prisma.contact.update({
      where: { id: contacts[0].id },
      data: { isPrimary: true },
    });
  }

  console.log(`Enriched ${prospect.domain}: ${result.contacts?.length ?? 0} contacts found`);
}
