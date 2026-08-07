export interface FollowUpDraftInput {
  repName: string;
  accountName: string;
  contactName: string;
  commitmentText: string;
  callSummary: string;
}

export interface FollowUpDraftResult {
  subject: string;
  body: string;
}

export interface FollowUpDraftProvider {
  name: string;
  draft(input: FollowUpDraftInput): Promise<FollowUpDraftResult>;
}

export const FOLLOWUP_SYSTEM_PROMPT = `You draft a short follow-up email from a B2B sales rep to a prospect, fulfilling one specific commitment made on a call.

Ground the email ONLY in the commitment text and call summary provided — never invent a document, date, or detail that isn't there. Keep it brief (3-5 sentences), professional but warm, reference the call naturally, and end with the rep's first name as the sign-off. Write the subject line to be specific to what's being sent, not generic ("Following up").`;
