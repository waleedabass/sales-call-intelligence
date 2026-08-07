import type { CallInsightProvider } from "./types";
import { createAnthropicCallInsightProvider } from "./anthropic";
import { createGeminiCallInsightProvider } from "./gemini";
import { createOpenRouterCallInsightProvider } from "./openrouter";

export function getCallInsightProvider(): CallInsightProvider {
  const requested = process.env.AI_PROVIDER?.toLowerCase();

  if (requested === "anthropic") return requireAnthropic();
  if (requested === "gemini") return requireGemini();
  if (requested === "openrouter") return requireOpenRouter();

  if (process.env.ANTHROPIC_API_KEY) return requireAnthropic();
  if (process.env.GEMINI_API_KEY) return requireGemini();
  if (process.env.OPENROUTER_API_KEY) return requireOpenRouter();

  throw new Error("No AI provider configured — set ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY.");
}

function requireAnthropic(): CallInsightProvider {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set.");
  return createAnthropicCallInsightProvider(process.env.ANTHROPIC_API_KEY);
}
function requireGemini(): CallInsightProvider {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set.");
  return createGeminiCallInsightProvider(process.env.GEMINI_API_KEY);
}
function requireOpenRouter(): CallInsightProvider {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set.");
  return createOpenRouterCallInsightProvider(process.env.OPENROUTER_API_KEY);
}

export { formatTranscriptForPrompt } from "./format";
export type { CallInsightProvider, CallInsightInput, CallInsightResult, TranscriptSegmentInput } from "./types";
