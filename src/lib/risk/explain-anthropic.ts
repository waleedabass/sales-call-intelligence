import Anthropic from "@anthropic-ai/sdk";
import { RISK_EXPLAIN_SYSTEM_PROMPT, type ExplainRiskInput, type RiskExplainProvider } from "./explain-types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const TOOL: Anthropic.Tool = {
  name: "explain_risk",
  description: "Submit the risk explanation.",
  input_schema: {
    type: "object",
    properties: { explanation: { type: "string" } },
    required: ["explanation"],
  } as unknown as Anthropic.Tool.InputSchema,
};

function formatPrompt(input: ExplainRiskInput): string {
  return `Account: ${input.accountName}\nRisk score: ${input.score}/100 (${input.label})\nFactors:\n${input.factors.map((f) => `- ${f.label} (+${f.points})`).join("\n")}\nUnresolved objections: ${input.unresolvedObjectionTexts.length > 0 ? input.unresolvedObjectionTexts.join("; ") : "none"}\nCompetitors mentioned: ${input.competitorNames.length > 0 ? input.competitorNames.join(", ") : "none"}`;
}

export function createAnthropicRiskExplainProvider(apiKey: string): RiskExplainProvider {
  const client = new Anthropic({ apiKey });

  return {
    name: "anthropic",
    async explain(input: ExplainRiskInput): Promise<string> {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        system: RISK_EXPLAIN_SYSTEM_PROMPT,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "explain_risk" },
        messages: [{ role: "user", content: formatPrompt(input) }],
      });

      const toolUse = message.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude did not return an explain_risk tool call.");
      return (toolUse.input as { explanation: string }).explanation;
    },
  };
}
