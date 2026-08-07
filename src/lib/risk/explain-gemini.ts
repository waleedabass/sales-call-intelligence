import { RISK_EXPLAIN_SYSTEM_PROMPT, type ExplainRiskInput, type RiskExplainProvider } from "./explain-types";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 8000, 20000];

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

function formatPrompt(input: ExplainRiskInput): string {
  return `Account: ${input.accountName}\nRisk score: ${input.score}/100 (${input.label})\nFactors:\n${input.factors.map((f) => `- ${f.label} (+${f.points})`).join("\n")}\nUnresolved objections: ${input.unresolvedObjectionTexts.length > 0 ? input.unresolvedObjectionTexts.join("; ") : "none"}\nCompetitors mentioned: ${input.competitorNames.length > 0 ? input.competitorNames.join(", ") : "none"}`;
}

export function createGeminiRiskExplainProvider(apiKey: string): RiskExplainProvider {
  return {
    name: "gemini",
    async explain(input: ExplainRiskInput): Promise<string> {
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: RISK_EXPLAIN_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: formatPrompt(input) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: { type: "OBJECT", properties: { explanation: { type: "STRING" } }, required: ["explanation"] },
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
          return (JSON.parse(text) as { explanation: string }).explanation;
        }
        lastError = new Error(`Gemini generateContent failed: ${res.status} ${await res.text()}`);
        if (!RETRYABLE_STATUS.has(res.status) || attempt === RETRY_DELAYS_MS.length) throw lastError;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      throw lastError;
    },
  };
}
