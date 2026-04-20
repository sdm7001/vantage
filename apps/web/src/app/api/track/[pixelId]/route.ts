import { prisma } from '@vantage/database';
import { NextRequest } from 'next/server';

// 1x1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export async function GET(req: NextRequest, { params }: { params: Promise<{ pixelId: string }> }) {
  const { pixelId } = await params;
  const emailId = pixelId.replace('.gif', '');

  // Non-blocking — don't slow down the response
  prisma.email.findFirst({
    where: { id: emailId },
    include: { thread: { select: { id: true, prospectId: true } } },
  }).then(async (email: { id: string; thread: { id: string; prospectId: string } | null } | null) => {
    if (!email) return;
    await prisma.emailEvent.create({
      data: {
        emailId,
        type: 'opened',
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    });
    if (email.thread?.prospectId) {
      await prisma.prospect.updateMany({
        where: {
          id: email.thread.prospectId,
          status: { notIn: ['ENGAGED', 'CONVERTED', 'REPLIED', 'SUPPRESSED', 'UNSUBSCRIBED'] as never[] },
        },
        data: { status: 'ENGAGED' },
      });
    }
  }).catch(() => {});

  return new Response(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
}
