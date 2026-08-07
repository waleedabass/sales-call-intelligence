import { FOLLOWUP_SYSTEM_PROMPT, type FollowUpDraftInput, type FollowUpDraftProvider, type FollowUpDraftResult } from "./types";

const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 8000, 20000];

const TOOL = {
  type: "function" as const,
  function: {
    name: "submit_followup_draft",
    description: "Submit the follow-up email draft.",
    parameters: {
      type: "object",
      properties: { subject: { type: "string" }, body: { type: "string" } },
      required: ["subject", "body"],
    },
  },
};

interface ChatCompletionResponse {
  choices?: { message?: { tool_calls?: { function: { arguments: string } }[] } }[];
}

function formatPrompt(input: FollowUpDraftInput): string {
  return `Rep: ${input.repName}\nAccount: ${input.accountName}\nContact: ${input.contactName}\nCall summary: ${input.callSummary}\n\nCommitment to fulfill: "${input.commitmentText}"`;
}

export function createOpenRouterFollowUpProvider(apiKey: string): FollowUpDraftProvider {
  return {
    name: "openrouter",
    async draft(input: FollowUpDraftInput): Promise<FollowUpDraftResult> {
      const body = JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        messages: [
          { role: "system", content: FOLLOWUP_SYSTEM_PROMPT },
          { role: "user", content: formatPrompt(input) },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "submit_followup_draft" } },
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
          if (!call) throw new Error("OpenRouter did not return a submit_followup_draft tool call.");
          return JSON.parse(call.function.arguments) as FollowUpDraftResult;
        }
        lastError = new Error(`OpenRouter chat completion failed: ${res.status} ${await res.text()}`);
        if (!RETRYABLE_STATUS.has(res.status) || attempt === RETRY_DELAYS_MS.length) throw lastError;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      throw lastError;
    },
  };
}
