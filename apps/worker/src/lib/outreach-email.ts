import type { Env } from '@vantage/config';

type BrandConfigFields = {
  senderName?: string | null;
  senderEmail?: string | null;
  companyName?: string | null;
  bookingUrl?: string | null;
} | null;

export type BrandSender = {
  senderName: string;
  senderEmail: string;
  senderCompany: string;
  bookingUrl: string | undefined;
  appUrl: string;
};

export function resolveBrandSender(brand: BrandConfigFields, env: Env): BrandSender {
  return {
    senderName: brand?.senderName ?? env.TEXMG_SENDER_NAME,
    senderEmail: brand?.senderEmail ?? env.TEXMG_SENDER_EMAIL,
    senderCompany: brand?.companyName ?? env.TEXMG_COMPANY_NAME,
    bookingUrl: brand?.bookingUrl ?? env.TEXMG_BOOKING_URL,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  };
}

export function buildEmailHtml(
  htmlBody: string,
  emailId: string,
  contactId: string,
  contactEmail: string,
  appUrl: string,
): string {
  const unsubToken = Buffer.from(`${contactId}:${contactEmail}`).toString('base64url');
  const trackingPixel = `<img src="${appUrl}/api/track/${emailId}.gif" width="1" height="1" style="display:none" alt="" />`;
  const footer = `<br/><br/><p style="font-size:11px;color:#999">To unsubscribe, <a href="${appUrl}/api/unsubscribe/${unsubToken}">click here</a>.</p>`;
  return htmlBody + trackingPixel + footer;
}
