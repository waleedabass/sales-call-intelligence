import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { toneFor } from "@/lib/tone";

export const dynamic = "force-dynamic";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await db.deal.findUnique({
    where: { id },
    include: {
      calls: { orderBy: { occurredAt: "desc" }, include: { insight: true } },
      riskFactors: { orderBy: { points: "desc" } },
    },
  });
  if (!deal) notFound();

  const callIds = deal.calls.map((c) => c.id);
  const [objections, commitments, competitorMentions, nextSteps] = await Promise.all([
    db.objection.findMany({ where: { callId: { in: callIds } }, include: { call: true } }),
    db.commitment.findMany({ where: { callId: { in: callIds } }, include: { call: true } }),
    db.competitorMention.findMany({ where: { callId: { in: callIds } }, include: { call: true } }),
    db.nextStep.findMany({ where: { callId: { in: callIds } }, include: { call: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            Deal summary
          </p>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{deal.accountName}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {deal.contactName} · {deal.contactEmail}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/deals/${deal.id}/crm-diff`} className="btn">
            CRM diff
          </Link>
          <span className="chip chip-info">{deal.stage.replace("_", " ")}</span>
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Deal risk</h2>
          {deal.riskScore !== null && (
            <div className="flex items-center gap-2">
              <span className="mono text-2xl font-semibold tabular-nums">{deal.riskScore}/100</span>
              <span className={`chip chip-${toneFor(deal.riskLabel ?? "low")}`}>{deal.riskLabel}</span>
            </div>
          )}
        </div>
        {deal.riskExplanation ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>{deal.riskExplanation}</p>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Not scored yet — process a call on this deal.</p>
        )}
        {deal.riskFactors.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-4">
            {deal.riskFactors.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--muted)" }}>{f.label}</span>
                <span className="mono">+{f.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <EvidencePanel
          title="Objections"
          items={objections.map((o) => ({ id: o.id, text: o.text, meta: o.resolved ? "resolved" : "unresolved", callId: o.callId }))}
        />
        <EvidencePanel
          title="Commitments"
          items={commitments.map((c) => ({ id: c.id, text: c.text, meta: `${c.owner} · ${c.status}`, callId: c.callId }))}
        />
        <EvidencePanel
          title="Competitor mentions"
          items={competitorMentions.map((c) => ({ id: c.id, text: `${c.competitorName} — ${c.context}`, meta: null, callId: c.callId }))}
        />
        <EvidencePanel
          title="Next steps"
          items={nextSteps.map((n) => ({ id: n.id, text: n.text, meta: null, callId: n.callId }))}
        />
      </div>

      <div className="panel overflow-hidden">
        <h2 className="text-sm font-semibold p-5 pb-0">Call history</h2>
        <div className="flex flex-col mt-3">
          {deal.calls.length === 0 ? (
            <p className="text-sm px-5 pb-5" style={{ color: "var(--muted)" }}>No calls yet.</p>
          ) : (
            deal.calls.map((call) => (
              <Link
                key={call.id}
                href={`/calls/${call.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3 border-t"
                style={{ borderColor: "var(--line-soft)" }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{call.title}</div>
                  <div className="text-xs truncate" style={{ color: "var(--muted-2)" }}>
                    {call.repName} · {timeAgo(call.createdAt)}
                  </div>
                </div>
                <span className={`chip chip-${toneFor(call.status)}`}>{call.status}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EvidencePanel({ title, items }: { title: string; items: { id: string; text: string; meta: string | null; callId: string }[] }) {
  return (
    <div className="panel p-5">
      <h2 className="text-sm font-semibold mb-3">
        {title} <span className="mono text-xs font-normal" style={{ color: "var(--muted-2)" }}>({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>None yet.</p>
      ) : (
        <ul className="flex flex-col gap-2.5 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/calls/${item.callId}`} className="hover:underline">
                {item.text}
              </Link>
              {item.meta && <span className="mono text-xs ml-2" style={{ color: "var(--muted-2)" }}>({item.meta})</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
