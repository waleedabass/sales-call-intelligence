"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getTranscriptionProvider } from "@/lib/transcription";
import { normalizeSegmentTimestamps } from "@/lib/transcription/normalize";
import { getWavDurationSec } from "@/lib/audio";
import { getCallInsightProvider } from "@/lib/extraction";
import { getCoachingProvider } from "@/lib/coaching";
import { getEmbeddingProvider } from "@/lib/embeddings";
import { searchTranscriptSegments, type CallSearchResult } from "@/lib/search";
import { recomputeDealRisk } from "@/lib/risk/recompute";
import { proposeCrmFieldChanges } from "@/lib/crm/propose";
import { getCrmProvider } from "@/lib/crm";
import { getFollowUpDraftProvider } from "@/lib/followup";
import { recordingsDir, saveRecording } from "@/lib/storage";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Mirrors processLead/processDocument from the sibling ARC projects: one
// pipeline function that walks a Call through every stage, called from a
// Server Action after upload. Built up incrementally — risk scoring, CRM
// diff proposals, and follow-up drafting are added in later phases.
export async function processCall(callId: string): Promise<void> {
  const call = await db.call.findUniqueOrThrow({ where: { id: callId }, include: { deal: true } });

  await db.call.update({ where: { id: callId }, data: { status: "transcribing" } });

  // 1. Transcribe.
  const fileBuffer = await readFile(path.join(recordingsDir(), call.recordingPath));
  const mimeType = call.recordingPath.endsWith(".wav") ? "audio/wav" : "application/octet-stream";
  const transcriptionProvider = getTranscriptionProvider();
  const rawSegments = await transcriptionProvider.transcribe(fileBuffer, mimeType);
  const durationSec = mimeType === "audio/wav" ? getWavDurationSec(fileBuffer) : null;
  const segments = normalizeSegmentTimestamps(rawSegments, durationSec);

  await db.transcriptSegment.deleteMany({ where: { callId } }); // idempotent on reprocess
  const createdSegments: Awaited<ReturnType<typeof db.transcriptSegment.create>>[] = [];
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const created = await db.transcriptSegment.create({
      data: { callId, speaker: s.speaker, startSec: s.startSec, endSec: s.endSec, text: s.text, order: i },
    });
    createdSegments.push(created);
  }

  await db.call.update({
    where: { id: callId },
    data: { status: "transcribed", durationSec: durationSec ? Math.round(durationSec) : null, transcriptionModel: transcriptionProvider.name },
  });

  // 2. Embed each segment for semantic call-library search (reuses
  // support-agent's Gemini-embedding + cosine-similarity approach).
  const embedder = getEmbeddingProvider();
  for (const s of createdSegments) {
    const vector = await embedder.embed(s.text);
    await db.transcriptSegment.update({ where: { id: s.id }, data: { embedding: JSON.stringify(vector) } });
  }

  // 3. Structured extraction, evidence-linked back to real segment rows via
  // the same array index the AI was given.
  const insightProvider = getCallInsightProvider();
  const insight = await insightProvider.extract({
    repName: call.repName,
    accountName: call.deal.accountName,
    segments: createdSegments.map((s, i) => ({ index: i, speaker: s.speaker, text: s.text })),
  });

  const segmentIdAt = (index: number): string | undefined => createdSegments[index]?.id;

  await db.callInsight.upsert({
    where: { callId },
    create: { callId, summary: insight.summary, sentiment: insight.sentiment, model: insightProvider.name },
    update: { summary: insight.summary, sentiment: insight.sentiment, model: insightProvider.name },
  });

  await db.objection.deleteMany({ where: { callId } });
  for (const o of insight.objections) {
    await db.objection.create({ data: { callId, text: o.text, resolved: o.resolved, segmentId: segmentIdAt(o.segmentIndex) } });
  }

  await db.commitment.deleteMany({ where: { callId } });
  const createdCommitments: Awaited<ReturnType<typeof db.commitment.create>>[] = [];
  for (const c of insight.commitments) {
    // The model is instructed to only fill dueDate for a concrete stated
    // date/timeframe, but "tomorrow morning" phrasing can still slip
    // through un-parseable as a real Date — fall back to null rather than
    // storing an Invalid Date; the full phrasing is preserved in c.text.
    const parsedDueDate = c.dueDate && !Number.isNaN(Date.parse(c.dueDate)) ? new Date(c.dueDate) : null;
    const created = await db.commitment.create({
      data: { callId, text: c.text, owner: c.owner, segmentId: segmentIdAt(c.segmentIndex), dueDate: parsedDueDate },
    });
    createdCommitments.push(created);
  }

  await db.competitorMention.deleteMany({ where: { callId } });
  for (const c of insight.competitorMentions) {
    await db.competitorMention.create({
      data: { callId, competitorName: c.competitorName, context: c.context, segmentId: segmentIdAt(c.segmentIndex) },
    });
  }

  await db.nextStep.deleteMany({ where: { callId } });
  for (const n of insight.nextSteps) {
    await db.nextStep.create({ data: { callId, text: n.text, segmentId: segmentIdAt(n.segmentIndex) } });
  }

  // 4. Coaching notes, grounded in the transcript + what was just extracted.
  const coachingProvider = getCoachingProvider();
  const notes = await coachingProvider.generate({
    repName: call.repName,
    segments: createdSegments.map((s, i) => ({ index: i, speaker: s.speaker, text: s.text })),
    summary: insight.summary,
    objections: insight.objections.map((o) => ({ text: o.text, resolved: o.resolved })),
    commitments: insight.commitments.map((c) => ({ text: c.text, owner: c.owner })),
  });

  await db.coachingNote.deleteMany({ where: { callId } });
  for (const n of notes) {
    await db.coachingNote.create({ data: { callId, repName: call.repName, category: n.category, insight: n.insight } });
  }

  await db.call.update({ where: { id: callId }, data: { status: "analyzed" } });

  // 5. Deterministic deal-risk recompute across the deal's full call
  // history, not just this one call.
  await recomputeDealRisk(call.dealId);

  // 6. Propose CRM field changes — written as "proposed", never applied
  // here. A manager has to approve each one on /deals/[id]/crm-diff.
  await proposeCrmFieldChanges(call.dealId, callId);

  // 7. Draft a follow-up email for every commitment the REP made — a
  // prospect's own commitment ("I'll get him on the calendar") isn't
  // something the rep should be emailing about.
  await db.followUpDraft.deleteMany({ where: { callId } });
  const repCommitments = createdCommitments.filter((c) => c.owner === "rep");
  if (repCommitments.length > 0) {
    const draftProvider = getFollowUpDraftProvider();
    for (const commitment of repCommitments) {
      const draft = await draftProvider.draft({
        repName: call.repName,
        accountName: call.deal.accountName,
        contactName: call.deal.contactName,
        commitmentText: commitment.text,
        callSummary: insight.summary,
      });
      await db.followUpDraft.create({
        data: { callId, commitmentId: commitment.id, subject: draft.subject, body: draft.body, status: "draft" },
      });
    }
  }

  revalidatePath(`/calls/${callId}`);
  revalidatePath(`/deals/${call.dealId}`);
  revalidatePath(`/deals/${call.dealId}/crm-diff`);
  revalidatePath("/");
}

export async function searchCallsAction(query: string): Promise<CallSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const embedder = getEmbeddingProvider();
  const queryEmbedding = await embedder.embed(trimmed);
  return searchTranscriptSegments(queryEmbedding);
}

export async function approveCrmFieldChangeAction(changeId: string): Promise<void> {
  const change = await db.crmFieldChange.findUniqueOrThrow({ where: { id: changeId }, include: { deal: true } });
  if (change.status !== "proposed") return;

  if (change.fieldName === "stage") {
    await db.deal.update({ where: { id: change.dealId }, data: { stage: change.newValue } });
  }

  const crm = getCrmProvider();
  const result = await crm.applyFieldChanges(change.deal.hubspotDealId, [{ fieldName: change.fieldName, value: change.newValue }]);

  await db.crmFieldChange.update({
    where: { id: changeId },
    data: { status: "applied", provider: result.provider, reviewedAt: new Date() },
  });

  revalidatePath(`/deals/${change.dealId}`);
  revalidatePath(`/deals/${change.dealId}/crm-diff`);
}

export async function rejectCrmFieldChangeAction(changeId: string): Promise<void> {
  const change = await db.crmFieldChange.findUniqueOrThrow({ where: { id: changeId } });
  if (change.status !== "proposed") return;

  await db.crmFieldChange.update({ where: { id: changeId }, data: { status: "rejected", reviewedAt: new Date() } });

  revalidatePath(`/deals/${change.dealId}`);
  revalidatePath(`/deals/${change.dealId}/crm-diff`);
}

// No real email-sending integration exists anywhere in this portfolio yet
// (same honest limitation as follow-ups in lead-qualification and export
// in document-ai) — approving always logs what would be sent rather than
// actually sending it. The subject/body reflect whatever the manager left
// in the form, so an edit before approving is captured too.
export async function approveAndSendFollowUpAction(draftId: string, formData: FormData): Promise<void> {
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || !body) throw new Error("Subject and body are required.");

  const draft = await db.followUpDraft.update({
    where: { id: draftId },
    data: { subject, body, status: "sent_log_only" },
    include: { call: { include: { deal: true } } },
  });

  console.log(`[FOLLOW-UP log-only — no email provider configured] to ${draft.call.deal.contactEmail}:\nSubject: ${subject}\n${body}`);

  revalidatePath(`/calls/${draft.callId}`);
  revalidatePath(`/calls/${draft.callId}/follow-up`);
}

export async function createCallAction(formData: FormData): Promise<void> {
  const dealId = String(formData.get("dealId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const repName = String(formData.get("repName") ?? "").trim();
  const file = formData.get("recording") as File | null;

  if (!dealId || !title || !repName || !file || file.size === 0) {
    throw new Error("Deal, title, rep name, and a recording file are all required.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const recordingPath = await saveRecording(buffer, file.name);

  const call = await db.call.create({ data: { dealId, title, repName, recordingPath, source: "upload" } });
  await processCall(call.id);
  redirect(`/calls/${call.id}`);
}

// The one ingestion path guaranteed to work for every visitor regardless of
// which conferencing tool they use is a manual upload — this is the demo
// shortcut so a portfolio visitor doesn't need their own recording on hand,
// same role as document-ai's pre-generated sample invoices.
export async function loadDemoCallAction(): Promise<void> {
  const deal = await db.deal.findFirstOrThrow({ where: { accountName: "Brightline Retail" } });
  const filename = "brightline-retail-demo.wav";
  const buffer = await readFile(path.join(process.cwd(), "sample-calls", filename));
  const recordingPath = await saveRecording(buffer, filename);

  const call = await db.call.create({
    data: { dealId: deal.id, title: "Brightline Retail — discovery call", repName: "Jordan Reyes", recordingPath, source: "upload" },
  });
  await processCall(call.id);
  redirect(`/calls/${call.id}`);
}
