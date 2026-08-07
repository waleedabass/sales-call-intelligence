import Link from "next/link";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { toneFor } from "@/lib/tone";
import { CallSearchBox } from "@/components/CallSearchBox";

export const dynamic = "force-dynamic";

export default async function CallLibraryPage() {
  const calls = await db.call.findMany({
    orderBy: { createdAt: "desc" },
    include: { deal: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          Sales call intelligence
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Call library</h1>
      </div>

      <CallSearchBox />

      {calls.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No calls yet.{" "}
            <Link href="/calls/new" className="underline">
              Upload one
            </Link>{" "}
            to see the pipeline in action.
          </p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="flex flex-col">
            {calls.map((call) => (
              <Link
                key={call.id}
                href={`/calls/${call.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3 border-t"
                style={{ borderColor: "var(--line-soft)" }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{call.title}</div>
                  <div className="text-xs truncate" style={{ color: "var(--muted-2)" }}>
                    {call.deal.accountName} · {call.repName} · {timeAgo(call.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {call.deal.riskScore !== null && (
                    <span className={`chip chip-${toneFor(call.deal.riskLabel ?? "low")}`}>{call.deal.riskLabel} risk</span>
                  )}
                  <span className={`chip chip-${toneFor(call.status)}`}>{call.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
