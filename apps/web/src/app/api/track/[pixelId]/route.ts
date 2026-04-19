import { prisma } from '@vantage/database';
import { NextRequest } from 'next/server';

// 1x1 transparent GIF
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

export async function GET(req: NextRequest, { params }: { params: Promise<{ pixelId: string }> }) {
  const { pixelId } = await params;
  const emailId = pixelId.replace('.gif', '');

  // Non-blocking — don't slow down the response
  prisma.email.findFirst({ where: { id: emailId } }).then(email => {
    if (!email) return;
    prisma.emailEvent.create({
      data: {
        emailId,
        type: 'opened',
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch(() => {});
  }).catch(() => {});

  return new Response(PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
  });
}
