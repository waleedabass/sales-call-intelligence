import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CoachingPage() {
  const notes = await db.coachingNote.findMany({
    orderBy: { id: "desc" },
    include: { call: { include: { deal: true } } },
  });

  const byRep = new Map<string, typeof notes>();
  for (const n of notes) {
    const existing = byRep.get(n.repName) ?? [];
    existing.push(n);
    byRep.set(n.repName, existing);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          Coaching
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Coaching dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Every note is grounded in a specific moment from a specific call — not generic sales advice.
        </p>
      </div>

      {byRep.size === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm" style={{ color: "var(--muted)" }}>No coaching notes yet — process a call to generate some.</p>
        </div>
      ) : (
        [...byRep.entries()].map(([repName, repNotes]) => (
          <div key={repName} className="panel p-5">
            <h2 className="text-sm font-semibold mb-4">
              {repName} <span className="mono text-xs font-normal" style={{ color: "var(--muted-2)" }}>({repNotes.length} notes)</span>
            </h2>
            <div className="flex flex-col gap-3">
              {repNotes.map((n) => (
                <div key={n.id} className="flex items-start justify-between gap-4">
                  <div>
                    <span className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>
                      {n.category.replace("_", " ")}
                    </span>
                    <p className="text-sm mt-0.5">{n.insight}</p>
                  </div>
                  <Link href={`/calls/${n.callId}`} className="text-xs underline shrink-0" style={{ color: "var(--muted-2)" }}>
                    {n.call.deal.accountName}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
