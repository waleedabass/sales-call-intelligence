import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { approveAndSendFollowUpAction } from "@/lib/actions";
import { toneFor } from "@/lib/tone";

export const dynamic = "force-dynamic";

export default async function FollowUpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = await db.call.findUnique({
    where: { id },
    include: { deal: true, followUpDrafts: { orderBy: { createdAt: "asc" }, include: { commitment: true } } },
  });
  if (!call) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          <Link href={`/calls/${call.id}`} className="underline">
            {call.title}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Follow-up drafts</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          To {call.deal.contactName} ({call.deal.contactEmail}). No email provider is wired up in this prototype —
          approving always logs exactly what would be sent rather than sending it (see README).
        </p>
      </div>

      {call.followUpDrafts.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No follow-up drafts — the rep didn&apos;t make any commitments on this call.
          </p>
        </div>
      ) : (
        call.followUpDrafts.map((draft) => (
          <div key={draft.id} className="panel p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              {draft.commitment && (
                <p className="text-xs" style={{ color: "var(--muted-2)" }}>
                  Fulfills: &ldquo;{draft.commitment.text}&rdquo;
                </p>
              )}
              <span className={`chip chip-${toneFor(draft.status)}`}>{draft.status.replace("_", " ")}</span>
            </div>

            {draft.status === "draft" ? (
              <form action={approveAndSendFollowUpAction.bind(null, draft.id)} className="flex flex-col gap-3">
                <div>
                  <label className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>
                    Subject
                  </label>
                  <input name="subject" defaultValue={draft.subject} required className="field mt-1" />
                </div>
                <div>
                  <label className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>
                    Body
                  </label>
                  <textarea name="body" defaultValue={draft.body} required rows={6} className="field mt-1" />
                </div>
                <button type="submit" className="btn btn-primary self-start">
                  Approve &amp; send →
                </button>
              </form>
            ) : (
              <div>
                <p className="text-sm font-medium mb-1">{draft.subject}</p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--muted)" }}>{draft.body}</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
