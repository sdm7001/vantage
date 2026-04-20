import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vantage/database';

// Records a landing page visit attributed to an outreach email.
// Called by the landing page JS on load when ?eid= or ?cid= params are present.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const emailId = searchParams.get('eid') ?? undefined;
    const contactId = searchParams.get('cid') ?? undefined;
    const utmSource = searchParams.get('utm_source') ?? undefined;
    const utmMedium = searchParams.get('utm_medium') ?? undefined;
    const utmCampaign = searchParams.get('utm_campaign') ?? undefined;

    // Resolve orgId from emailId if present (no auth required — public endpoint)
    let orgId: string | undefined;
    let prospectId: string | undefined;

    if (emailId) {
      const email = await prisma.email.findUnique({
        where: { id: emailId },
        select: {
          thread: {
            select: {
              prospect: { select: { id: true, orgId: true } },
            },
          },
        },
      });
      if (email?.thread?.prospect) {
        orgId = email.thread.prospect.orgId;
        prospectId = email.thread.prospect.id;
      }
    }

    await prisma.landingPageVisit.create({
      data: {
        orgId,
        prospectId,
        contactId,
        emailId,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
        referrer: req.headers.get('referer') ?? undefined,
        utmSource,
        utmMedium,
        utmCampaign,
      },
    });

    if (prospectId) {
      await prisma.prospect.updateMany({
        where: {
          id: prospectId,
          status: { notIn: ['ENGAGED', 'CONVERTED', 'SUPPRESSED', 'UNSUBSCRIBED'] as never[] },
        },
        data: { status: 'ENGAGED' },
      });
    }
  } catch {
    // Attribution is best-effort — never fail the page load
  }

  return new NextResponse(null, { status: 204 });
}
