import { getEnv } from '@vantage/config';

interface TokenCache { token: string; expiresAt: number }
let _cache: TokenCache | null = null;

export async function getGraphToken(): Promise<string> {
  if (_cache && Date.now() < _cache.expiresAt - 60_000) return _cache.token;

  const env = getEnv();
  const res = await fetch(
    `https://login.microsoftonline.com/${env.M365_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env.M365_CLIENT_ID,
        client_secret: env.M365_CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
      }).toString(),
    }
  );

  if (!res.ok) throw new Error(`M365 auth failed: ${res.status} ${await res.text()}`);

  const data = await res.json() as { access_token: string; expires_in: number };
  _cache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return _cache.token;
}

export interface SendEmailParams {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  messageId: string;
  conversationId: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const token = await getGraphToken();
  const env = getEnv();
  const mailbox = env.M365_FROM_EMAIL;

  // Create draft — this gives us messageId + conversationId before sending
  const createRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${mailbox}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: params.subject,
        body: { contentType: 'HTML', content: params.html },
        toRecipients: [{ emailAddress: { address: params.to } }],
        from: { emailAddress: { name: params.fromName, address: mailbox } },
        replyTo: [{ emailAddress: { name: params.fromName, address: params.fromEmail } }],
      }),
    }
  );

  if (!createRes.ok) throw new Error(`M365 create draft failed: ${createRes.status} ${await createRes.text()}`);

  const draft = await createRes.json() as { id: string; conversationId: string };

  // Send the draft
  const sendRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${mailbox}/messages/${draft.id}/send`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
  );

  if (!sendRes.ok && sendRes.status !== 202) {
    throw new Error(`M365 send failed: ${sendRes.status} ${await sendRes.text()}`);
  }

  return { messageId: draft.id, conversationId: draft.conversationId };
}
