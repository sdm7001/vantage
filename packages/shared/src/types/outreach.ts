// Outreach and email types

export type EmailDraft = {
  subject: string;
  htmlBody: string;
  textBody: string;
  fromName: string;
  fromEmail: string;
};

export type OutreachContext = {
  prospectDomain: string;
  companyName: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactTitle?: string;
  overallScore: number;
  topPainPoint: string;
  outreachAngle: string;
  reportPublicUrl: string;
  senderName: string;
  senderCompany: string;
  senderEmail: string;
  bookingUrl?: string;
};

export type FollowupContext = OutreachContext & {
  sequenceIndex: 1 | 2 | 3 | 4 | 5;
  previousEmailSubject: string;
  previousEmailSentAt: string;
  threadEngagement: {
    opened: boolean;
    clicked: boolean;
  };
};

export type FollowupAngle = {
  1: 'new_pain_point';
  2: 'social_proof';
  3: 'value_add_tip';
  4: 'roi_proof';
  5: 'break_up';
};
