import type { EmbeddingProvider } from "./types";

// Anthropic has no embeddings API, so — same as support-agent — this is
// Gemini-only, and also the free-tier path, which matters since a call
// with 20+ turns means 20+ embed calls per call processed.
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [800, 2000];

interface EmbedContentResponse {
  embedding?: { values?: number[] };
  embeddings?: { values?: number[] }[];
}

export function createGeminiEmbeddingProvider(apiKey: string): EmbeddingProvider {
  return {
    name: "gemini",
    async embed(text: string): Promise<number[]> {
      const body = JSON.stringify({
        model: `models/${MODEL}`,
        content: { parts: [{ text }] },
      });

      let lastError: Error = new Error("unreachable");
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        const res = await fetch(`${BASE_URL}/models/${MODEL}:embedContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });

        if (res.ok) {
          const data = (await res.json()) as EmbedContentResponse;
          const values = data.embedding?.values ?? data.embeddings?.[0]?.values;
          if (!values) throw new Error("Gemini embedContent returned no vector.");
          return values;
        }

        lastError = new Error(`Gemini embedContent failed: ${res.status} ${await res.text()}`);
        if (!RETRYABLE_STATUS.has(res.status) || attempt === RETRY_DELAYS_MS.length) throw lastError;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      throw lastError;
    },
  };
}
