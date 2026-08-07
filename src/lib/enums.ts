// SQLite has no native enum type, so the schema stores these as String.
// Single source of truth for allowed values.

export const DEAL_STAGES = ["discovery", "technical_evaluation", "proposal", "negotiation", "closed_won", "closed_lost"] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

export const RISK_LABELS = ["low", "medium", "high"] as const;
export type RiskLabel = (typeof RISK_LABELS)[number];

export const CALL_SOURCES = ["upload", "zoom", "teams", "meet", "twilio"] as const;
export type CallSource = (typeof CALL_SOURCES)[number];

export const CALL_STATUSES = ["uploaded", "transcribing", "transcribed", "analyzed", "failed"] as const;
export type CallStatus = (typeof CALL_STATUSES)[number];

export const SPEAKERS = ["rep", "prospect", "unknown"] as const;
export type Speaker = (typeof SPEAKERS)[number];

export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const COMMITMENT_OWNERS = ["rep", "prospect"] as const;
export type CommitmentOwner = (typeof COMMITMENT_OWNERS)[number];

export const COMMITMENT_STATUSES = ["open", "fulfilled", "broken"] as const;
export type CommitmentStatus = (typeof COMMITMENT_STATUSES)[number];

export const COACHING_CATEGORIES = ["objection_handling", "talk_ratio", "next_steps", "discovery"] as const;
export type CoachingCategory = (typeof COACHING_CATEGORIES)[number];

export const CRM_FIELD_CHANGE_STATUSES = ["proposed", "approved", "rejected", "applied"] as const;
export type CrmFieldChangeStatus = (typeof CRM_FIELD_CHANGE_STATUSES)[number];

export const FOLLOWUP_DRAFT_STATUSES = ["draft", "approved", "sent_log_only"] as const;
export type FollowUpDraftStatus = (typeof FOLLOWUP_DRAFT_STATUSES)[number];
