import { RISK_EXPLAIN_SYSTEM_PROMPT, type ExplainRiskInput, type RiskExplainProvider } from "./explain-types";

const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 8000, 20000];

const TOOL = {
  type: "function" as const,
  function: {
    name: "explain_risk",
    description: "Submit the risk explanation.",
    parameters: {
      type: "object",
      properties: { explanation: { type: "string" } },
      required: ["explanation"],
    },
  },
};

interface ChatCompletionResponse {
  choices?: { message?: { tool_calls?: { function: { arguments: string } }[] } }[];
}

function formatPrompt(input: ExplainRiskInput): string {
  return `Account: ${input.accountName}\nRisk score: ${input.score}/100 (${input.label})\nFactors:\n${input.factors.map((f) => `- ${f.label} (+${f.points})`).join("\n")}\nUnresolved objections: ${input.unresolvedObjectionTexts.length > 0 ? input.unresolvedObjectionTexts.join("; ") : "none"}\nCompetitors mentioned: ${input.competitorNames.length > 0 ? input.competitorNames.join(", ") : "none"}`;
}

export function createOpenRouterRiskExplainProvider(apiKey: string): RiskExplainProvider {
  return {
    name: "openrouter",
    async explain(input: ExplainRiskInput): Promise<string> {
      const body = JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        messages: [
          { role: "system", content: RISK_EXPLAIN_SYSTEM_PROMPT },
          { role: "user", content: formatPrompt(input) },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "explain_risk" } },
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
          if (!call) throw new Error("OpenRouter did not return an explain_risk tool call.");
          return (JSON.parse(call.function.arguments) as { explanation: string }).explanation;
        }
        lastError = new Error(`OpenRouter chat completion failed: ${res.status} ${await res.text()}`);
        if (!RETRYABLE_STATUS.has(res.status) || attempt === RETRY_DELAYS_MS.length) throw lastError;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      throw lastError;
    },
  };
}
