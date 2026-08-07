import type { Speaker } from "@/lib/enums";

export interface TranscriptSegmentResult {
  speaker: Speaker;
  startSec: number;
  endSec: number;
  text: string;
}

export interface TranscriptionProvider {
  name: string;
  transcribe(fileBuffer: Buffer, mimeType: string): Promise<TranscriptSegmentResult[]>;
}
