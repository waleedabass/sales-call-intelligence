import { COACHING_CATEGORIES } from "@/lib/enums";
import { COACHING_SYSTEM_PROMPT, type CoachingInput, type CoachingNoteResult, type CoachingProvider } from "./types";
import { formatCoachingPrompt } from "./format";

const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 8000, 20000];

const TOOL = {
  type: "function" as const,
  function: {
    name: "submit_coaching_notes",
    description: "Submit coaching notes for this call.",
    parameters: {
      type: "object",
      properties: {
        notes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: { type: "string", enum: [...COACHING_CATEGORIES] },
              insight: { type: "string" },
            },
            required: ["category", "insight"],
          },
        },
      },
      required: ["notes"],
    },
  },
};

interface ChatCompletionResponse {
  choices?: { message?: { tool_calls?: { function: { arguments: string } }[] } }[];
}

export function createOpenRouterCoachingProvider(apiKey: string): CoachingProvider {
  return {
    name: "openrouter",
    async generate(input: CoachingInput): Promise<CoachingNoteResult[]> {
      const body = JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        messages: [
          { role: "system", content: COACHING_SYSTEM_PROMPT },
          { role: "user", content: formatCoachingPrompt(input) },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "submit_coaching_notes" } },
      });

      let lastError: Error = new Error("unreachable");
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        const res = await fetch(BASE_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://arcautomations.in",
            "X-Title": "ARC Automations Sales Call Intelligence",
          },
          body,
        });
        if (res.ok) {
          const data = (await res.json()) as ChatCompletionResponse;
          const call = data.choices?.[0]?.message?.tool_calls?.[0];
          if (!call) throw new Error("OpenRouter did not return a submit_coaching_notes tool call.");
          return (JSON.parse(call.function.arguments) as { notes: CoachingNoteResult[] }).notes;
        }
        lastError = new Error(`OpenRouter chat completion failed: ${res.status} ${await res.text()}`);
        if (!RETRYABLE_STATUS.has(res.status) || attempt === RETRY_DELAYS_MS.length) throw lastError;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      throw lastError;
    },
  };
}
