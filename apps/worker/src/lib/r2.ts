import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from '@vantage/config';

let _client: S3Client | null = null;

function getR2Client(): S3Client {
  if (_client) return _client;
  const env = getEnv();
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  return _client;
}

export async function uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
  const env = getEnv();
  const client = getR2Client();

  await client.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return key;
}

export async function uploadJson(key: string, data: unknown): Promise<string> {
  return uploadBuffer(key, Buffer.from(JSON.stringify(data), 'utf-8'), 'application/json');
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const env = getEnv();
  const client = getR2Client();

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    { expiresIn }
  );
}

export function getPublicUrl(key: string): string {
  return `${getEnv().R2_PUBLIC_URL}/${key}`;
}

export function buildR2Key(prefix: string, id: string, filename: string): string {
  return `${prefix}/${id}/${filename}`;
}
