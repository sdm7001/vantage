import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@vantage/database';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let contactId: string;
  let email: string;

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    [contactId, email] = decoded.split(':');
    if (!contactId || !email) throw new Error('invalid');
  } catch {
    return new Response('Invalid unsubscribe link.', { status: 400 });
  }

  const contact = await prisma.contact.findFirst({ where: { id: contactId, email } });
  if (!contact) {
    return new Response('Already processed or not found.', { status: 200 });
  }

  const prospect = await prisma.prospect.findFirst({ where: { id: contact.prospectId } });
  if (!prospect) {
    return new Response('Not found.', { status: 404 });
  }

  await Promise.all([
    prisma.suppressionEntry.upsert({
      where: { orgId_type_value: { orgId: prospect.orgId, type: 'EMAIL', value: email } },
      update: {},
      create: { orgId: prospect.orgId, type: 'EMAIL', value: email, reason: 'unsubscribed' },
    }),
    prisma.outreachThread.updateMany({
      where: { prospectId: contact.prospectId },
      data: { state: 'OPTED_OUT', nextActionAt: null },
    }),
    prisma.prospect.update({
      where: { id: contact.prospectId },
      data: { status: 'UNSUBSCRIBED' },
    }),
  ]);

  return new NextResponse(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Unsubscribed</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc}
.card{background:white;padding:40px;border-radius:12px;text-align:center;max-width:400px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
h2{color:#0f172a}p{color:#64748b;font-size:14px}</style></head>
<body><div class="card">
  <h2>You've been unsubscribed</h2>
  <p>We've removed ${email} from our outreach list. You won't hear from us again.</p>
</div></body></html>`, {
    headers: { 'Content-Type': 'text/html' },
  });
}
