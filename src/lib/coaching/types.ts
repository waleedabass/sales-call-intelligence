import type { CoachingCategory } from "@/lib/enums";
import type { TranscriptSegmentInput } from "@/lib/extraction/types";

export interface CoachingInput {
  repName: string;
  segments: TranscriptSegmentInput[];
  summary: string;
  objections: { text: string; resolved: boolean }[];
  commitments: { text: string; owner: string }[];
}

export interface CoachingNoteResult {
  category: CoachingCategory;
  insight: string;
}

export interface CoachingProvider {
  name: string;
  generate(input: CoachingInput): Promise<CoachingNoteResult[]>;
}

export const COACHING_SYSTEM_PROMPT = `You are a sales coach reviewing one call transcript for the rep's manager. The transcript, a summary, and the extracted objections/commitments are provided as grounding.

Write 2-4 short, specific coaching notes, each in one of these categories:
- objection_handling: how well the rep handled a specific objection (praise what worked, or name a real gap — reference what was actually said)
- talk_ratio: whether the rep let the prospect talk enough, based on how the conversation actually flowed
- next_steps: whether the call ended with a clear, concrete next step or left things vague
- discovery: whether the rep asked enough real discovery questions before pitching

Ground every note in something that actually happened in this specific transcript — quote or closely paraphrase the actual moment. Never write generic sales advice that could apply to any call. If a category doesn't have anything genuinely worth noting for this call, skip it rather than padding.`;
