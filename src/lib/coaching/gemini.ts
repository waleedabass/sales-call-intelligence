import { COACHING_CATEGORIES } from "@/lib/enums";
import { COACHING_SYSTEM_PROMPT, type CoachingInput, type CoachingNoteResult, type CoachingProvider } from "./types";
import { formatCoachingPrompt } from "./format";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 8000, 20000];

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    notes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING", enum: [...COACHING_CATEGORIES] },
          insight: { type: "STRING" },
        },
        required: ["category", "insight"],
      },
    },
  },
  required: ["notes"],
};

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export function createGeminiCoachingProvider(apiKey: string): CoachingProvider {
  return {
    name: "gemini",
    async generate(input: CoachingInput): Promise<CoachingNoteResult[]> {
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: COACHING_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: formatCoachingPrompt(input) }] }],
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
          return (JSON.parse(text) as { notes: CoachingNoteResult[] }).notes;
        }
        lastError = new Error(`Gemini generateContent failed: ${res.status} ${await res.text()}`);
        if (!RETRYABLE_STATUS.has(res.status) || attempt === RETRY_DELAYS_MS.length) throw lastError;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      throw lastError;
    },
  };
}
