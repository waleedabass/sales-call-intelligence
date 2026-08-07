import type { CoachingProvider } from "./types";
import { createAnthropicCoachingProvider } from "./anthropic";
import { createGeminiCoachingProvider } from "./gemini";
import { createOpenRouterCoachingProvider } from "./openrouter";

export function getCoachingProvider(): CoachingProvider {
  const requested = process.env.AI_PROVIDER?.toLowerCase();

  if (requested === "anthropic") return requireAnthropic();
  if (requested === "gemini") return requireGemini();
  if (requested === "openrouter") return requireOpenRouter();

  if (process.env.ANTHROPIC_API_KEY) return requireAnthropic();
  if (process.env.GEMINI_API_KEY) return requireGemini();
  if (process.env.OPENROUTER_API_KEY) return requireOpenRouter();

  throw new Error("No AI provider configured — set ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY.");
}

function requireAnthropic(): CoachingProvider {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set.");
  return createAnthropicCoachingProvider(process.env.ANTHROPIC_API_KEY);
}
function requireGemini(): CoachingProvider {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set.");
  return createGeminiCoachingProvider(process.env.GEMINI_API_KEY);
}
function requireOpenRouter(): CoachingProvider {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set.");
  return createOpenRouterCoachingProvider(process.env.OPENROUTER_API_KEY);
}

export type { CoachingProvider, CoachingInput, CoachingNoteResult } from "./types";
