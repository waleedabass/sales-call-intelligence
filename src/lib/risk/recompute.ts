import { db } from "@/lib/db";
import { computeRisk } from "./score";
import { getRiskExplainProvider } from "./index";
import { DEAL_STAGES } from "@/lib/enums";

const EARLY_STAGES: readonly string[] = [DEAL_STAGES[0], DEAL_STAGES[1]]; // discovery, technical_evaluation

// Recomputes a deal's risk from its FULL call history, not just the call
// that was just processed — the brief's own contrast against average tools
// is detecting risk "across multiple calls," so this always re-aggregates
// from scratch rather than incrementally patching the previous score.
export async function recomputeDealRisk(dealId: string): Promise<void> {
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
  const calls = await db.call.findMany({ where: { dealId, status: "analyzed" }, orderBy: { occurredAt: "desc" } });
  const callIds = calls.map((c) => c.id);

  const [objections, commitments, competitorMentions] = await Promise.all([
    db.objection.findMany({ where: { callId: { in: callIds } } }),
    db.commitment.findMany({ where: { callId: { in: callIds } } }),
    db.competitorMention.findMany({ where: { callId: { in: callIds } } }),
  ]);

  const now = new Date();
  const unresolvedObjectionCount = objections.filter((o) => !o.resolved).length;
  const overdueCommitmentCount = commitments.filter((c) => c.status === "open" && c.dueDate && c.dueDate < now).length;
  const daysSinceLastCall = calls.length > 0 ? Math.floor((now.getTime() - calls[0].occurredAt.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const result = computeRisk({
    unresolvedObjectionCount,
    overdueCommitmentCount,
    competitorMentionCount: competitorMentions.length,
    daysSinceLastCall,
    callCount: calls.length,
    stageIsEarly: EARLY_STAGES.includes(deal.stage),
  });

  await db.riskFactor.deleteMany({ where: { dealId } });
  for (const f of result.factors) {
    await db.riskFactor.create({ data: { dealId, label: f.label, points: f.points } });
  }

  let explanation = deal.riskExplanation;
  try {
    const explainProvider = getRiskExplainProvider();
    explanation = await explainProvider.explain({
      accountName: deal.accountName,
      score: result.score,
      label: result.label,
      factors: result.factors,
      unresolvedObjectionTexts: objections.filter((o) => !o.resolved).map((o) => o.text),
      competitorNames: [...new Set(competitorMentions.map((c) => c.competitorName))],
    });
  } catch {
    // The score itself is deterministic and already computed above — an AI
    // outage (rate limit, no key) shouldn't block the number just because
    // the narrative explanation call failed. Keeps the previous
    // explanation rather than clearing it to an empty string.
  }

  await db.deal.update({
    where: { id: dealId },
    data: { riskScore: result.score, riskLabel: result.label, riskExplanation: explanation, riskUpdatedAt: now },
  });

  // One snapshot per recompute so /risk can show a real rising/falling
  // trend instead of just a static current number.
  await db.riskSnapshot.create({ data: { dealId, score: result.score } });
}
