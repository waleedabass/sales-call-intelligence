// Maps the many status/label strings across this project's enums to one of
// five chip tones — cheaper than a CSS class per enum value (see globals.css).
export type Tone = "neutral" | "info" | "good" | "warn" | "danger";

const TONE_BY_VALUE: Record<string, Tone> = {
  // Call.status
  uploaded: "neutral",
  transcribing: "info",
  transcribed: "info",
  analyzed: "good",
  failed: "danger",
  // Deal.riskLabel
  low: "good",
  medium: "warn",
  high: "danger",
  // Commitment.status
  open: "info",
  fulfilled: "good",
  broken: "danger",
  // CrmFieldChange.status
  proposed: "neutral",
  approved: "good",
  rejected: "danger",
  applied: "good",
  // FollowUpDraft.status
  draft: "neutral",
  sent_log_only: "good",
};

export function toneFor(status: string): Tone {
  return TONE_BY_VALUE[status] ?? "neutral";
}
