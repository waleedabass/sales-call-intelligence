import { SPEAKERS, type Speaker } from "@/lib/enums";
import { getWavDurationSec } from "@/lib/audio";
import type { TranscriptionProvider, TranscriptSegmentResult } from "./types";

// Native audio input — same reasoning as document-ai skipping a separate
// OCR step: Gemini accepts audio directly via inlineData and returns a
// structured, speaker-labeled, timestamped transcript in one call. No
// separate ASR/diarization service, zero extra signup.
//
// One real gotcha found live while building this: SAPI-synthesized test
// audio concatenated with an odd (non-sample-aligned) byte-length silence
// buffer between turns corrupted every other turn's 16-bit alignment,
// which looked exactly like Gemini silently dropping every other
// speaker's turns. It wasn't a Gemini limitation — once the WAV generator
// was fixed to insert only whole-sample silence gaps, a single
// generateContent call transcribed all 20 real turns correctly. Worth
// knowing if a future recording ever comes back oddly one-sided: check the
// audio's sample alignment before blaming the model.
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 8000, 20000];

const SYSTEM_PROMPT = `You transcribe a two-speaker B2B sales call recording. The sales rep speaks first.
Label each speaker turn as "rep" or "prospect" consistently by voice — never "unknown" unless a turn is truly inaudible.
Give start/end timestamps in seconds for every turn, in chronological order.
Transcribe every turn from both speakers verbatim — do not skip, merge, or summarize any turn.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    segments: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          speaker: { type: "STRING", enum: [...SPEAKERS] },
          start_sec: { type: "NUMBER" },
          end_sec: { type: "NUMBER" },
          text: { type: "STRING" },
        },
        required: ["speaker", "start_sec", "end_sec", "text"],
      },
    },
  },
  required: ["segments"],
};

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export function createGeminiTranscriptionProvider(apiKey: string): TranscriptionProvider {
  return {
    name: "gemini",
    async transcribe(fileBuffer: Buffer, mimeType: string): Promise<TranscriptSegmentResult[]> {
      const base64 = fileBuffer.toString("base64");
      // Timestamps are estimated from audio content, not decoded from a
      // precise clock, and were observed live to drift on longer calls.
      // Anchoring the prompt with the file's real (deterministically
      // computed) duration measurably tightens that estimate; normalize.ts
      // still clamps as a hard backstop regardless.
      const durationSec = mimeType === "audio/wav" ? getWavDurationSec(fileBuffer) : null;
      const instruction = durationSec
        ? `Transcribe this call with speaker labels and timestamps. The recording is exactly ${durationSec.toFixed(1)} seconds long — every timestamp must fall within that range.`
        : "Transcribe this call with speaker labels and timestamps.";
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType, data: base64 } }, { text: instruction }],
          },
        ],
        generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
      });

      let lastError: Error = new Error("unreachable");
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        const res = await fetch(`${BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

        if (res.ok) {
          const data = (await res.json()) as GenerateContentResponse;
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error("Gemini returned no content.");
          const parsed = JSON.parse(text) as {
            segments: { speaker: Speaker; start_sec: number; end_sec: number; text: string }[];
          };
          return parsed.segments.map((s) => ({ speaker: s.speaker, startSec: s.start_sec, endSec: s.end_sec, text: s.text }));
        }

        lastError = new Error(`Gemini generateContent failed: ${res.status} ${await res.text()}`);
        if (!RETRYABLE_STATUS.has(res.status) || attempt === RETRY_DELAYS_MS.length) throw lastError;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      throw lastError;
    },
  };
}
