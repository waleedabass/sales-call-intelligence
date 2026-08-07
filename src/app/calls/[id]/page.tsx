import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TranscriptViewer, type SegmentTag, type ViewerSegment } from "@/components/TranscriptViewer";
import { timeAgo } from "@/lib/format";
import { toneFor } from "@/lib/tone";

export const dynamic = "force-dynamic";

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = await db.call.findUnique({
    where: { id },
    include: {
      deal: true,
      segments: { orderBy: { order: "asc" } },
      insight: true,
      objections: true,
      commitments: true,
      competitorMentions: true,
      nextSteps: true,
      coachingNotes: true,
      followUpDrafts: true,
    },
  });
  if (!call) notFound();

  const tagsBySegment = new Map<string, SegmentTag[]>();
  const addTag = (segmentId: string | null, tag: SegmentTag) => {
    if (!segmentId) return;
    const existing = tagsBySegment.get(segmentId) ?? [];
    existing.push(tag);
    tagsBySegment.set(segmentId, existing);
  };
  for (const o of call.objections) addTag(o.segmentId, { kind: "objection", label: o.resolved ? "Resolved" : "Unresolved" });
  for (const c of call.commitments) addTag(c.segmentId, { kind: "commitment", label: c.owner });
  for (const c of call.competitorMentions) addTag(c.segmentId, { kind: "competitor", label: c.competitorName });
  for (const n of call.nextSteps) addTag(n.segmentId, { kind: "next_step", label: "" });

  const viewerSegments: ViewerSegment[] = call.segments.map((s) => ({
    id: s.id,
    speaker: s.speaker,
    startSec: s.startSec,
    endSec: s.endSec,
    text: s.text,
    tags: tagsBySegment.get(s.id) ?? [],
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            <Link href={`/deals/${call.dealId}`} className="underline">
              {call.deal.accountName}
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{call.title}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {call.repName} · {timeAgo(call.createdAt)} · {call.durationSec ? `${Math.round(call.durationSec / 60)}m` : "—"}
            {call.transcriptionModel && <> · transcribed by {call.transcriptionModel}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {call.followUpDrafts.length > 0 && (
            <Link href={`/calls/${call.id}/follow-up`} className="btn">
              Follow-up drafts ({call.followUpDrafts.length})
            </Link>
          )}
          <Link href={`/deals/${call.dealId}/crm-diff`} className="btn">
            CRM diff
          </Link>
          <span className={`chip chip-${toneFor(call.status)}`}>{call.status}</span>
        </div>
      </div>

      {call.status !== "analyzed" ? (
        <div className="panel p-8 text-center">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {call.status === "failed" ? "Processing failed." : `Still processing — status: ${call.status}.`}
          </p>
        </div>
      ) : (
        <>
          {call.insight && (
            <div className="panel p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">Summary</h2>
                <span className={`chip chip-${call.insight.sentiment === "positive" ? "good" : call.insight.sentiment === "negative" ? "danger" : "neutral"}`}>
                  {call.insight.sentiment}
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--muted)" }}>{call.insight.summary}</p>
            </div>
          )}

          <TranscriptViewer callId={call.id} segments={viewerSegments} />

          {call.coachingNotes.length > 0 && (
            <div className="panel p-5">
              <h2 className="text-sm font-semibold mb-3">Coaching notes</h2>
              <div className="flex flex-col gap-3">
                {call.coachingNotes.map((n) => (
                  <div key={n.id}>
                    <span className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>
                      {n.category.replace("_", " ")}
                    </span>
                    <p className="text-sm mt-0.5">{n.insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
