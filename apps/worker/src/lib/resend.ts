import { Resend } from 'resend';
import { getEnv } from '@vantage/config';

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (_resend) return _resend;
  _resend = new Resend(getEnv().RESEND_API_KEY);
  return _resend;
}

export type SendEmailParams = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
};

export async function sendEmail(params: SendEmailParams): Promise<{ id: string }> {
  const resend = getResend();
  const result = await resend.emails.send({
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    attachments: params.attachments?.map(a => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType ?? 'application/octet-stream',
    })),
    headers: params.headers,
    tags: params.tags,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }

  return { id: result.data!.id };
}
