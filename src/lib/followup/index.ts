import type { FollowUpDraftProvider } from "./types";
import { createAnthropicFollowUpProvider } from "./anthropic";
import { createGeminiFollowUpProvider } from "./gemini";
import { createOpenRouterFollowUpProvider } from "./openrouter";

export function getFollowUpDraftProvider(): FollowUpDraftProvider {
  const requested = process.env.AI_PROVIDER?.toLowerCase();

  if (requested === "anthropic") return requireAnthropic();
  if (requested === "gemini") return requireGemini();
  if (requested === "openrouter") return requireOpenRouter();

  if (process.env.ANTHROPIC_API_KEY) return requireAnthropic();
  if (process.env.GEMINI_API_KEY) return requireGemini();
  if (process.env.OPENROUTER_API_KEY) return requireOpenRouter();

  throw new Error("No AI provider configured — set ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY.");
}

function requireAnthropic(): FollowUpDraftProvider {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set.");
  return createAnthropicFollowUpProvider(process.env.ANTHROPIC_API_KEY);
}
function requireGemini(): FollowUpDraftProvider {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set.");
  return createGeminiFollowUpProvider(process.env.GEMINI_API_KEY);
}
function requireOpenRouter(): FollowUpDraftProvider {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set.");
  return createOpenRouterFollowUpProvider(process.env.OPENROUTER_API_KEY);
}

export type { FollowUpDraftProvider, FollowUpDraftInput, FollowUpDraftResult } from "./types";
