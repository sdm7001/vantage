import { NextRequest } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@vantage/database';
import { getEnv } from '@vantage/config';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const env = getEnv();

  const report = await prisma.prospectReport.findFirst({
    where: { publicToken: token, status: 'ready' },
  });

  if (!report?.pdfKey) {
    return new Response('Report not found or not ready.', { status: 404 });
  }

  // Increment view count (non-blocking)
  prisma.prospectReport.update({
    where: { id: report.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  // Stream PDF from R2
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  try {
    const res = await client.send(new GetObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: report.pdfKey,
    }));

    if (!res.Body) return new Response('PDF not available.', { status: 502 });

    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const inline = req.nextUrl.searchParams.get('download') !== '1';

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(buffer.length),
        'Content-Disposition': inline
          ? `inline; filename="website-audit-${token.slice(0, 8)}.pdf"`
          : `attachment; filename="website-audit-${token.slice(0, 8)}.pdf"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    console.error('PDF stream error:', err);
    return new Response('Failed to load report.', { status: 502 });
  }
}
