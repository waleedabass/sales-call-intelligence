import Anthropic from "@anthropic-ai/sdk";
import { COACHING_CATEGORIES } from "@/lib/enums";
import { COACHING_SYSTEM_PROMPT, type CoachingInput, type CoachingNoteResult, type CoachingProvider } from "./types";
import { formatCoachingPrompt } from "./format";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const TOOL: Anthropic.Tool = {
  name: "submit_coaching_notes",
  description: "Submit coaching notes for this call.",
  input_schema: {
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
  } as unknown as Anthropic.Tool.InputSchema,
};

export function createAnthropicCoachingProvider(apiKey: string): CoachingProvider {
  const client = new Anthropic({ apiKey });

  return {
    name: "anthropic",
    async generate(input: CoachingInput): Promise<CoachingNoteResult[]> {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 1200,
        system: COACHING_SYSTEM_PROMPT,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "submit_coaching_notes" },
        messages: [{ role: "user", content: formatCoachingPrompt(input) }],
      });

      const toolUse = message.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude did not return a submit_coaching_notes tool call.");
      return (toolUse.input as { notes: CoachingNoteResult[] }).notes;
    },
  };
}
