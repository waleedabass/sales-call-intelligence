import type { RiskExplainProvider } from "./explain-types";
import { createAnthropicRiskExplainProvider } from "./explain-anthropic";
import { createGeminiRiskExplainProvider } from "./explain-gemini";
import { createOpenRouterRiskExplainProvider } from "./explain-openrouter";

export function getRiskExplainProvider(): RiskExplainProvider {
  const requested = process.env.AI_PROVIDER?.toLowerCase();

  if (requested === "anthropic") return requireAnthropic();
  if (requested === "gemini") return requireGemini();
  if (requested === "openrouter") return requireOpenRouter();

  if (process.env.ANTHROPIC_API_KEY) return requireAnthropic();
  if (process.env.GEMINI_API_KEY) return requireGemini();
  if (process.env.OPENROUTER_API_KEY) return requireOpenRouter();

  throw new Error("No AI provider configured — set ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY.");
}

function requireAnthropic(): RiskExplainProvider {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set.");
  return createAnthropicRiskExplainProvider(process.env.ANTHROPIC_API_KEY);
}
function requireGemini(): RiskExplainProvider {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set.");
  return createGeminiRiskExplainProvider(process.env.GEMINI_API_KEY);
}
function requireOpenRouter(): RiskExplainProvider {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set.");
  return createOpenRouterRiskExplainProvider(process.env.OPENROUTER_API_KEY);
}

export { computeRisk } from "./score";
export type { RiskFactorResult, RiskScoreInput, RiskScoreResult } from "./score";
export type { RiskExplainProvider, ExplainRiskInput } from "./explain-types";
