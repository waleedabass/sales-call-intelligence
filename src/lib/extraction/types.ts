import type { CommitmentOwner, Sentiment } from "@/lib/enums";

export interface TranscriptSegmentInput {
  index: number;
  speaker: string;
  text: string;
}

export interface CallInsightInput {
  repName: string;
  accountName: string;
  segments: TranscriptSegmentInput[];
}

export interface ExtractedObjection {
  text: string;
  segmentIndex: number;
  resolved: boolean;
}

export interface ExtractedCommitment {
  text: string;
  owner: CommitmentOwner;
  segmentIndex: number;
  dueDate: string | null; // ISO date, only if a concrete date/timeframe was actually stated
}

export interface ExtractedCompetitorMention {
  competitorName: string;
  context: string;
  segmentIndex: number;
}

export interface ExtractedNextStep {
  text: string;
  segmentIndex: number;
}

export interface CallInsightResult {
  summary: string;
  sentiment: Sentiment;
  objections: ExtractedObjection[];
  commitments: ExtractedCommitment[];
  competitorMentions: ExtractedCompetitorMention[];
  nextSteps: ExtractedNextStep[];
}

export interface CallInsightProvider {
  name: string;
  extract(input: CallInsightInput): Promise<CallInsightResult>;
}

export const CALL_INSIGHT_SYSTEM_PROMPT = `You analyze a B2B sales call transcript for a CRM copilot. The transcript is a numbered list of speaker turns.

Extract, grounded ONLY in what was actually said — never invent anything not present in the transcript:
- summary: 2-3 sentences on what happened in the call.
- sentiment: overall prospect sentiment — "positive", "neutral", or "negative".
- objections: concerns, pushback, or hesitations the prospect raised (pricing, security, timing, fit, etc). Mark resolved=true only if the rep directly addressed that specific objection later in the same call.
- commitments: anything either party explicitly promised to do (send a document, schedule a call, get approval, etc). owner is who made the promise. dueDate only if a concrete date or clear timeframe was actually stated (e.g. "by tomorrow", "next week") — otherwise null, never guess a date.
- competitor_mentions: any named competing product/vendor the prospect or rep referenced.
- next_steps: concrete next actions agreed for after this call.

For every item, segment_index must be the exact index of the transcript turn where that item was stated — this is how the UI links a claim back to its exact moment in the recording, so it must be accurate, not approximate.`;
