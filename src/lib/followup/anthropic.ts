import Anthropic from "@anthropic-ai/sdk";
import { FOLLOWUP_SYSTEM_PROMPT, type FollowUpDraftInput, type FollowUpDraftProvider, type FollowUpDraftResult } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const TOOL: Anthropic.Tool = {
  name: "submit_followup_draft",
  description: "Submit the follow-up email draft.",
  input_schema: {
    type: "object",
    properties: { subject: { type: "string" }, body: { type: "string" } },
    required: ["subject", "body"],
  } as unknown as Anthropic.Tool.InputSchema,
};

function formatPrompt(input: FollowUpDraftInput): string {
  return `Rep: ${input.repName}\nAccount: ${input.accountName}\nContact: ${input.contactName}\nCall summary: ${input.callSummary}\n\nCommitment to fulfill: "${input.commitmentText}"`;
}

export function createAnthropicFollowUpProvider(apiKey: string): FollowUpDraftProvider {
  const client = new Anthropic({ apiKey });

  return {
    name: "anthropic",
    async draft(input: FollowUpDraftInput): Promise<FollowUpDraftResult> {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 600,
        system: FOLLOWUP_SYSTEM_PROMPT,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "submit_followup_draft" },
        messages: [{ role: "user", content: formatPrompt(input) }],
      });

      const toolUse = message.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude did not return a submit_followup_draft tool call.");
      return toolUse.input as FollowUpDraftResult;
    },
  };
}
