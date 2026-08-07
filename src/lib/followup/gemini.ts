import { FOLLOWUP_SYSTEM_PROMPT, type FollowUpDraftInput, type FollowUpDraftProvider, type FollowUpDraftResult } from "./types";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 8000, 20000];

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

function formatPrompt(input: FollowUpDraftInput): string {
  return `Rep: ${input.repName}\nAccount: ${input.accountName}\nContact: ${input.contactName}\nCall summary: ${input.callSummary}\n\nCommitment to fulfill: "${input.commitmentText}"`;
}

export function createGeminiFollowUpProvider(apiKey: string): FollowUpDraftProvider {
  return {
    name: "gemini",
    async draft(input: FollowUpDraftInput): Promise<FollowUpDraftResult> {
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: FOLLOWUP_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: formatPrompt(input) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: { subject: { type: "STRING" }, body: { type: "STRING" } },
            required: ["subject", "body"],
          },
        },
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
          return JSON.parse(text) as FollowUpDraftResult;
        }
        lastError = new Error(`Gemini generateContent failed: ${res.status} ${await res.text()}`);
        if (!RETRYABLE_STATUS.has(res.status) || attempt === RETRY_DELAYS_MS.length) throw lastError;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      throw lastError;
    },
  };
}
