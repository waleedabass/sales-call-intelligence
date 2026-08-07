import { db } from "@/lib/db";

// Every proposed change here is a plain deterministic rule reading real
// extracted data — no AI guessing a CRM value. "stage" mirrors Deal.stage
// directly (a real internal field); next_step / competitor / risk_score
// have no internal Deal column, so their "current" value is whatever was
// last actually applied (tracked through CrmFieldChange history), not
// re-derived each time — that's what makes this a genuine diff instead of
// just restating the latest extraction.
async function getLastAppliedValue(dealId: string, fieldName: string): Promise<string> {
  const last = await db.crmFieldChange.findFirst({
    where: { dealId, fieldName, status: "applied" },
    orderBy: { createdAt: "desc" },
  });
  return last?.newValue ?? "—";
}

export async function proposeCrmFieldChanges(dealId: string, callId: string): Promise<void> {
  const deal = await db.deal.findUniqueOrThrow({ where: { id: dealId } });
  const call = await db.call.findUniqueOrThrow({
    where: { id: callId },
    include: { nextSteps: true, competitorMentions: true },
  });

  const proposals: { fieldName: string; oldValue: string; newValue: string; evidenceSegmentId: string | null }[] = [];

  // risk_score — always propose after a recompute, since it's the clearest
  // "updates exact CRM fields" signal the brief calls out.
  if (deal.riskScore !== null) {
    const oldValue = await getLastAppliedValue(dealId, "risk_score");
    const newValue = String(deal.riskScore);
    if (oldValue !== newValue) proposals.push({ fieldName: "risk_score", oldValue, newValue, evidenceSegmentId: null });
  }

  // next_step — most recent one captured on this call.
  if (call.nextSteps.length > 0) {
    const latest = call.nextSteps[call.nextSteps.length - 1];
    const oldValue = await getLastAppliedValue(dealId, "next_step");
    if (oldValue !== latest.text) {
      proposals.push({ fieldName: "next_step", oldValue, newValue: latest.text, evidenceSegmentId: latest.segmentId });
    }
  }

  // competitor — union of competitor names mentioned on this call.
  if (call.competitorMentions.length > 0) {
    const names = [...new Set(call.competitorMentions.map((c) => c.competitorName))].join(", ");
    const oldValue = await getLastAppliedValue(dealId, "competitor");
    if (oldValue !== names) {
      proposals.push({ fieldName: "competitor", oldValue, newValue: names, evidenceSegmentId: call.competitorMentions[0].segmentId });
    }
  }

  // stage — a call happened and produced a concrete next step while the
  // deal is still sitting in the very first stage; propose advancing it
  // rather than leaving stage tracking entirely manual.
  if (deal.stage === "discovery" && call.nextSteps.length > 0) {
    proposals.push({ fieldName: "stage", oldValue: deal.stage, newValue: "technical_evaluation", evidenceSegmentId: call.nextSteps[0].segmentId });
  }

  for (const p of proposals) {
    await db.crmFieldChange.create({
      data: {
        dealId,
        callId,
        fieldName: p.fieldName,
        oldValue: p.oldValue,
        newValue: p.newValue,
        evidenceSegmentId: p.evidenceSegmentId,
        status: "proposed",
      },
    });
  }
}
