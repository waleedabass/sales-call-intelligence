import Anthropic from "@anthropic-ai/sdk";
import { SENTIMENTS, COMMITMENT_OWNERS } from "@/lib/enums";
import { CALL_INSIGHT_SYSTEM_PROMPT, type CallInsightInput, type CallInsightProvider, type CallInsightResult } from "./types";
import { formatTranscriptForPrompt } from "./format";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const TOOL: Anthropic.Tool = {
  name: "submit_call_insight",
  description: "Submit the extracted call insight.",
  input_schema: {
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
  } as unknown as Anthropic.Tool.InputSchema,
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

export function createAnthropicCallInsightProvider(apiKey: string): CallInsightProvider {
  const client = new Anthropic({ apiKey });

  return {
    name: "anthropic",
    async extract(input: CallInsightInput): Promise<CallInsightResult> {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: CALL_INSIGHT_SYSTEM_PROMPT,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "submit_call_insight" },
        messages: [
          {
            role: "user",
            content: `Rep: ${input.repName}\nAccount: ${input.accountName}\n\nTranscript:\n${formatTranscriptForPrompt(input.segments)}`,
          },
        ],
      });

      const toolUse = message.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude did not return a submit_call_insight tool call.");
      return toResult(toolUse.input as RawResult);
    },
  };
}
