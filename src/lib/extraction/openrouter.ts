import { SENTIMENTS, COMMITMENT_OWNERS } from "@/lib/enums";
import { CALL_INSIGHT_SYSTEM_PROMPT, type CallInsightInput, type CallInsightProvider, type CallInsightResult } from "./types";
import { formatTranscriptForPrompt } from "./format";

const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 8000, 20000];

const TOOL = {
  type: "function" as const,
  function: {
    name: "submit_call_insight",
    description: "Submit the extracted call insight.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string" },
        sentiment: { type: "string", enum: [...SENTIMENTS] },
        objections: {
          type: "array",
          items: {
            type: "object",
            properties: { text: { type: "string" }, segment_index: { type: "integer" }, resolved: { type: "boolean" } },
            required: ["text", "segment_index", "resolved"],
          },
        },
        commitments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              owner: { type: "string", enum: [...COMMITMENT_OWNERS] },
              segment_index: { type: "integer" },
              due_date: { type: ["string", "null"] },
            },
            required: ["text", "owner", "segment_index", "due_date"],
          },
        },
        competitor_mentions: {
          type: "array",
          items: {
            type: "object",
            properties: { competitor_name: { type: "string" }, context: { type: "string" }, segment_index: { type: "integer" } },
            required: ["competitor_name", "context", "segment_index"],
          },
        },
        next_steps: {
          type: "array",
          items: {
            type: "object",
            properties: { text: { type: "string" }, segment_index: { type: "integer" } },
            required: ["text", "segment_index"],
          },
        },
      },
      required: ["summary", "sentiment", "objections", "commitments", "competitor_mentions", "next_steps"],
    },
  },
};

interface RawResult {
  summary: string;
  sentiment: CallInsightResult["sentiment"];
  objections: { text: string; segment_index: number; resolved: boolean }[];
  commitments: { text: string; owner: CallInsightResult["commitments"][number]["owner"]; segment_index: number; due_date: string | null }[];
  competitor_mentions: { competitor_name: string; context: string; segment_index: number }[];
  next_steps: { text: string; segment_index: number }[];
}

function toResult(raw: RawResult): CallInsightResult {
  return {
    summary: raw.summary,
    sentiment: raw.sentiment,
    objections: raw.objections.map((o) => ({ text: o.text, segmentIndex: o.segment_index, resolved: o.resolved })),
    commitments: raw.commitments.map((c) => ({ text: c.text, owner: c.owner, segmentIndex: c.segment_index, dueDate: c.due_date })),
    competitorMentions: raw.competitor_mentions.map((c) => ({ competitorName: c.competitor_name, context: c.context, segmentIndex: c.segment_index })),
    nextSteps: raw.next_steps.map((n) => ({ text: n.text, segmentIndex: n.segment_index })),
  };
}

interface ChatCompletionResponse {
  choices?: { message?: { tool_calls?: { function: { arguments: string } }[] } }[];
}

export function createOpenRouterCallInsightProvider(apiKey: string): CallInsightProvider {
  return {
    name: "openrouter",
    async extract(input: CallInsightInput): Promise<CallInsightResult> {
      const body = JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [
          { role: "system", content: CALL_INSIGHT_SYSTEM_PROMPT },
          { role: "user", content: `Rep: ${input.repName}\nAccount: ${input.accountName}\n\nTranscript:\n${formatTranscriptForPrompt(input.segments)}` },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "submit_call_insight" } },
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
          if (!call) throw new Error("OpenRouter did not return a submit_call_insight tool call.");
          return toResult(JSON.parse(call.function.arguments) as RawResult);
        }
        lastError = new Error(`OpenRouter chat completion failed: ${res.status} ${await res.text()}`);
        if (!RETRYABLE_STATUS.has(res.status) || attempt === RETRY_DELAYS_MS.length) throw lastError;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      throw lastError;
    },
  };
}
