import { formatTranscriptForPrompt } from "@/lib/extraction/format";
import type { CoachingInput } from "./types";

export function formatCoachingPrompt(input: CoachingInput): string {
  const objectionsBlock = input.objections.length
    ? input.objections.map((o) => `- "${o.text}" (${o.resolved ? "resolved" : "not clearly resolved"})`).join("\n")
    : "none";
  const commitmentsBlock = input.commitments.length
    ? input.commitments.map((c) => `- ${c.owner}: "${c.text}"`).join("\n")
    : "none";

  return `Rep: ${input.repName}\n\nSummary: ${input.summary}\n\nObjections raised:\n${objectionsBlock}\n\nCommitments made:\n${commitmentsBlock}\n\nFull transcript:\n${formatTranscriptForPrompt(input.segments)}`;
}
