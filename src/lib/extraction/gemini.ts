import { SENTIMENTS, COMMITMENT_OWNERS } from "@/lib/enums";
import { CALL_INSIGHT_SYSTEM_PROMPT, type CallInsightInput, type CallInsightProvider, type CallInsightResult } from "./types";
import { formatTranscriptForPrompt } from "./format";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 8000, 20000];

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    sentiment: { type: "STRING", enum: [...SENTIMENTS] },
    objections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { text: { type: "STRING" }, segment_index: { type: "INTEGER" }, resolved: { type: "BOOLEAN" } },
        required: ["text", "segment_index", "resolved"],
      },
    },
    commitments: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          owner: { type: "STRING", enum: [...COMMITMENT_OWNERS] },
          segment_index: { type: "INTEGER" },
          due_date: { type: "STRING", nullable: true },
        },
        required: ["text", "owner", "segment_index", "due_date"],
      },
    },
    competitor_mentions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { competitor_name: { type: "STRING" }, context: { type: "STRING" }, segment_index: { type: "INTEGER" } },
        required: ["competitor_name", "context", "segment_index"],
      },
    },
    next_steps: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { text: { type: "STRING" }, segment_index: { type: "INTEGER" } },
        required: ["text", "segment_index"],
      },
    },
  },
  required: ["summary", "sentiment", "objections", "commitments", "competitor_mentions", "next_steps"],
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

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export function createGeminiCallInsightProvider(apiKey: string): CallInsightProvider {
  return {
    name: "gemini",
    async extract(input: CallInsightInput): Promise<CallInsightResult> {
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: CALL_INSIGHT_SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [{ text: `Rep: ${input.repName}\nAccount: ${input.accountName}\n\nTranscript:\n${formatTranscriptForPrompt(input.segments)}` }],
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
          return toResult(JSON.parse(text) as RawResult);
        }
        lastError = new Error(`Gemini generateContent failed: ${res.status} ${await res.text()}`);
        if (!RETRYABLE_STATUS.has(res.status) || attempt === RETRY_DELAYS_MS.length) throw lastError;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      throw lastError;
    },
  };
}
