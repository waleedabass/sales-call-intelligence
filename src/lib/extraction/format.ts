import type { TranscriptSegmentInput } from "./types";

export function formatTranscriptForPrompt(segments: TranscriptSegmentInput[]): string {
  return segments.map((s) => `[${s.index}] ${s.speaker}: ${s.text}`).join("\n");
}
