import type { Speaker } from "@/lib/enums";
import type { TranscriptionProvider, TranscriptSegmentResult } from "./types";

// Real, dedicated ASR + acoustic speaker diarization — assemblyai.com/dashboard
// has a free tier (no card for a trial account). Genuinely more robust than
// asking an LLM to diarize by voice for messy real recordings (crosstalk,
// more than two participants, phone-quality audio) than the Gemini path in
// gemini.ts, which is a general-purpose model doing its best rather than a
// model trained specifically for diarization.
const BASE_URL = "https://api.assemblyai.com/v2";
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

interface UploadResponse {
  upload_url: string;
}

interface TranscriptCreateResponse {
  id: string;
}

interface Utterance {
  speaker: string; // "A" | "B" | ...
  start: number; // ms
  end: number; // ms
  text: string;
}

interface TranscriptStatusResponse {
  status: "queued" | "processing" | "completed" | "error";
  error?: string;
  utterances?: Utterance[];
}

export function createAssemblyAiTranscriptionProvider(apiKey: string): TranscriptionProvider {
  return {
    name: "assemblyai",
    async transcribe(fileBuffer: Buffer): Promise<TranscriptSegmentResult[]> {
      const uploadRes = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        headers: { authorization: apiKey },
        body: new Uint8Array(fileBuffer),
      });
      if (!uploadRes.ok) throw new Error(`AssemblyAI upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
      const { upload_url } = (await uploadRes.json()) as UploadResponse;

      const createRes = await fetch(`${BASE_URL}/transcript`, {
        method: "POST",
        headers: { authorization: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ audio_url: upload_url, speaker_labels: true }),
      });
      if (!createRes.ok) throw new Error(`AssemblyAI transcript create failed: ${createRes.status} ${await createRes.text()}`);
      const { id } = (await createRes.json()) as TranscriptCreateResponse;

      const startedAt = Date.now();
      while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const statusRes = await fetch(`${BASE_URL}/transcript/${id}`, { headers: { authorization: apiKey } });
        if (!statusRes.ok) throw new Error(`AssemblyAI status check failed: ${statusRes.status} ${await statusRes.text()}`);
        const status = (await statusRes.json()) as TranscriptStatusResponse;

        if (status.status === "error") throw new Error(`AssemblyAI transcription failed: ${status.error}`);
        if (status.status === "completed") {
          const utterances = status.utterances ?? [];
          // AssemblyAI labels speakers "A", "B", ... by acoustic clustering,
          // not by role. Standard sales-call convention: the rep opens the
          // call, so whichever label speaks first is "rep".
          const firstSpeakerLabel = utterances[0]?.speaker;
          const toRoleSpeaker = (label: string): Speaker => (label === firstSpeakerLabel ? "rep" : "prospect");

          return utterances.map((u) => ({
            speaker: toRoleSpeaker(u.speaker),
            startSec: u.start / 1000,
            endSec: u.end / 1000,
            text: u.text,
          }));
        }
      }
      throw new Error("AssemblyAI transcription timed out.");
    },
  };
}
