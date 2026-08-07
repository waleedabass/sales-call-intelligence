import { db } from "@/lib/db";

export interface CallSearchResult {
  segmentId: string;
  callId: string;
  callTitle: string;
  dealAccountName: string;
  speaker: string;
  startSec: number;
  text: string;
  score: number; // cosine similarity, -1..1
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Cosine similarity over embeddings stored as JSON, computed in application
// code — same approach and scale caveat as support-agent's knowledge-base
// search (fine for hundreds of transcript segments; swap for pgvector once
// a real call library outgrows a full scan).
export async function searchTranscriptSegments(queryEmbedding: number[], topK = 8): Promise<CallSearchResult[]> {
  const segments = await db.transcriptSegment.findMany({
    where: { embedding: { not: null } },
    include: { call: { include: { deal: true } } },
  });

  const scored = segments.map((s) => ({
    segmentId: s.id,
    callId: s.callId,
    callTitle: s.call.title,
    dealAccountName: s.call.deal.accountName,
    speaker: s.speaker,
    startSec: s.startSec,
    text: s.text,
    score: cosineSimilarity(queryEmbedding, JSON.parse(s.embedding!) as number[]),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
