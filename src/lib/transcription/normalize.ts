import type { TranscriptSegmentResult } from "./types";

// Transcription timestamps are model-estimated from audio content, not
// decoded from a precise clock, and were observed live to occasionally
// drift past a call's real duration on longer recordings. A timeline UI
// that lets someone click a claim and seek to it can't tolerate that, so
// this clamps everything into [0, durationSec] and forces non-decreasing
// order — independent of how confident the transcription call itself was,
// same "validate in plain code" split as document-ai's validation.ts.
export function normalizeSegmentTimestamps(
  segments: TranscriptSegmentResult[],
  durationSec: number | null
): TranscriptSegmentResult[] {
  if (!durationSec || durationSec <= 0) return segments;

  let prevEnd = 0;
  return segments.map((s) => {
    const start = Math.min(Math.max(s.startSec, prevEnd), durationSec);
    let end = Math.min(Math.max(s.endSec, start), durationSec);
    if (end < start) end = start;
    prevEnd = end;
    return { ...s, startSec: start, endSec: end };
  });
}
