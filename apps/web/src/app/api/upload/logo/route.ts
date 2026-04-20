import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@vantage/database';
import { getEnv } from '@vantage/config';

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

export async function POST(req: NextRequest) {
  const { userId, orgId: clerkOrgId } = await auth();
  if (!userId || !clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const org = await prisma.organization.findFirst({ where: { clerkOrgId }, select: { id: true } });
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 2 MB)' }, { status: 400 });

  const env = getEnv();
  const ext = file.type.split('/')[1]?.replace('svg+xml', 'svg') ?? 'png';
  const key = `logos/${org.id}.${ext}`;

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  await client.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: file.type,
    CacheControl: 'public, max-age=31536000',
  }));

  // Persist the key to BrandConfig
  await prisma.brandConfig.upsert({
    where: { orgId: org.id },
    update: { logoR2Key: key },
    create: { orgId: org.id, logoR2Key: key },
  });

  const logoUrl = `${env.R2_PUBLIC_URL}/${key}`;
  return NextResponse.json({ key, url: logoUrl });
}
