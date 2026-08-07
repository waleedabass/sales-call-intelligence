import type { TranscriptionProvider } from "./types";
import { createGeminiTranscriptionProvider } from "./gemini";
import { createAssemblyAiTranscriptionProvider } from "./assemblyai";

export function getTranscriptionProvider(): TranscriptionProvider {
  if (process.env.ASSEMBLYAI_API_KEY) {
    return createAssemblyAiTranscriptionProvider(process.env.ASSEMBLYAI_API_KEY);
  }
  if (process.env.GEMINI_API_KEY) {
    return createGeminiTranscriptionProvider(process.env.GEMINI_API_KEY);
  }
  throw new Error("No transcription provider configured — set GEMINI_API_KEY (zero-setup default) or ASSEMBLYAI_API_KEY (real diarization) in .env.");
}

export type { TranscriptionProvider, TranscriptSegmentResult } from "./types";
