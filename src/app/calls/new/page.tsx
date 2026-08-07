import { db } from "@/lib/db";
import { createCallAction, loadDemoCallAction } from "@/lib/actions";

export default async function NewCallPage() {
  const deals = await db.deal.findMany({ orderBy: { accountName: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          Call intelligence
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Upload a call</h1>
      </div>

      <div className="panel p-6">
        <h2 className="text-sm font-semibold mb-2">No recording handy?</h2>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          Load the pre-built Cascade Analytics ↔ Brightline Retail demo call — a real, synthesized two-speaker
          recording scripted to hit a security objection, a promised document, a competitor mention, and a
          concrete next step, so the full pipeline has something real to chew on.
        </p>
        <form action={loadDemoCallAction}>
          <button type="submit" className="btn btn-primary">
            Process the demo call →
          </button>
        </form>
      </div>

      <div className="panel p-6">
        <h2 className="text-sm font-semibold mb-4">Or upload your own</h2>
        {deals.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>No deals exist yet — run the seed script first.</p>
        ) : (
          <form action={createCallAction} className="flex flex-col gap-4">
            <div>
              <label className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>
                Deal
              </label>
              <select name="dealId" required className="field mt-1">
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.accountName} — {d.stage}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>
                Call title
              </label>
              <input name="title" required placeholder="e.g. Discovery call" className="field mt-1" />
            </div>
            <div>
              <label className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>
                Rep name
              </label>
              <input name="repName" required placeholder="e.g. Jordan Reyes" className="field mt-1" />
            </div>
            <div>
              <label className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>
                Recording (WAV)
              </label>
              <input type="file" name="recording" accept="audio/wav,.wav" required className="field mt-1" />
              <p className="text-xs mt-1" style={{ color: "var(--muted-2)" }}>
                16-bit PCM WAV only for now — see README for why.
              </p>
            </div>
            <button type="submit" className="btn btn-primary mt-1">
              Upload &amp; process →
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
