import type { EmbeddingProvider } from "./types";
import { createGeminiEmbeddingProvider } from "./gemini";

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set — embeddings require Gemini (see .env.example).");
  }
  return createGeminiEmbeddingProvider(process.env.GEMINI_API_KEY);
}

export type { EmbeddingProvider } from "./types";
