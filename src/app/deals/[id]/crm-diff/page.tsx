import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { approveCrmFieldChangeAction, rejectCrmFieldChangeAction } from "@/lib/actions";
import { timeAgo } from "@/lib/format";
import { toneFor } from "@/lib/tone";

export const dynamic = "force-dynamic";

export default async function CrmDiffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await db.deal.findUnique({
    where: { id },
    include: { crmFieldChanges: { orderBy: { createdAt: "desc" }, include: { call: true } } },
  });
  if (!deal) notFound();

  const proposed = deal.crmFieldChanges.filter((c) => c.status === "proposed");
  const decided = deal.crmFieldChanges.filter((c) => c.status !== "proposed");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          <Link href={`/deals/${deal.id}`} className="underline">
            {deal.accountName}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">CRM diff</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Every proposed field change is deterministic, evidence-linked, and gated on your approval — nothing
          reaches {deal.hubspotDealId ? "HubSpot" : "the CRM"} unreviewed.
          {!deal.hubspotDealId && " This deal isn't linked to a real HubSpot record yet, so approvals log instead of syncing — see README."}
        </p>
      </div>

      <div className="panel overflow-hidden">
        <h2 className="text-sm font-semibold p-5 pb-3">
          Pending review <span className="mono text-xs font-normal" style={{ color: "var(--muted-2)" }}>({proposed.length})</span>
        </h2>
        {proposed.length === 0 ? (
          <p className="text-sm px-5 pb-5" style={{ color: "var(--muted)" }}>Nothing waiting on review.</p>
        ) : (
          <div className="flex flex-col">
            {proposed.map((change) => (
              <div key={change.id} className="flex items-center justify-between gap-4 px-5 py-4 border-t" style={{ borderColor: "var(--line-soft)" }}>
                <div className="min-w-0">
                  <div className="mono text-xs uppercase tracking-wide mb-1" style={{ color: "var(--muted-2)" }}>
                    {change.fieldName.replace("_", " ")}
                  </div>
                  <div className="text-sm">
                    <span style={{ color: "var(--muted)", textDecoration: "line-through" }}>{change.oldValue}</span>
                    {" → "}
                    <span className="font-medium">{change.newValue}</span>
                  </div>
                  <Link href={`/calls/${change.callId}`} className="text-xs underline" style={{ color: "var(--muted-2)" }}>
                    view evidence
                  </Link>
                </div>
                <div className="flex gap-2 shrink-0">
                  <form action={rejectCrmFieldChangeAction.bind(null, change.id)}>
                    <button type="submit" className="btn">Reject</button>
                  </form>
                  <form action={approveCrmFieldChangeAction.bind(null, change.id)}>
                    <button type="submit" className="btn btn-primary">Approve</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel overflow-hidden">
        <h2 className="text-sm font-semibold p-5 pb-3">Reviewed</h2>
        {decided.length === 0 ? (
          <p className="text-sm px-5 pb-5" style={{ color: "var(--muted)" }}>Nothing reviewed yet.</p>
        ) : (
          <div className="flex flex-col">
            {decided.map((change) => (
              <div key={change.id} className="flex items-center justify-between gap-4 px-5 py-3 border-t" style={{ borderColor: "var(--line-soft)" }}>
                <div className="min-w-0 text-sm">
                  <span className="mono text-xs uppercase tracking-wide mr-2" style={{ color: "var(--muted-2)" }}>
                    {change.fieldName.replace("_", " ")}
                  </span>
                  {change.oldValue} → {change.newValue}
                  {change.provider && <span className="mono text-xs ml-2" style={{ color: "var(--muted-2)" }}>via {change.provider}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs" style={{ color: "var(--muted-2)" }}>{change.reviewedAt && timeAgo(change.reviewedAt)}</span>
                  <span className={`chip chip-${toneFor(change.status)}`}>{change.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
