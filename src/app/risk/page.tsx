import Link from "next/link";
import { db } from "@/lib/db";
import { toneFor } from "@/lib/tone";

export const dynamic = "force-dynamic";

type Trend = "rising" | "falling" | "flat" | "new";

function trendGlyph(trend: Trend): string {
  return trend === "rising" ? "↑" : trend === "falling" ? "↓" : trend === "flat" ? "→" : "•";
}

export default async function RiskPage() {
  const deals = await db.deal.findMany({ orderBy: { riskScore: "desc" } });

  const trends = new Map<string, Trend>();
  for (const deal of deals) {
    const lastTwo = await db.riskSnapshot.findMany({ where: { dealId: deal.id }, orderBy: { createdAt: "desc" }, take: 2 });
    if (lastTwo.length < 2) {
      trends.set(deal.id, "new");
    } else if (lastTwo[0].score > lastTwo[1].score) {
      trends.set(deal.id, "rising");
    } else if (lastTwo[0].score < lastTwo[1].score) {
      trends.set(deal.id, "falling");
    } else {
      trends.set(deal.id, "flat");
    }
  }

  const scored = deals.filter((d) => d.riskScore !== null);
  const unscored = deals.filter((d) => d.riskScore === null);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          Risk
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Risk dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Ranked by deterministic risk score, recomputed from every call on the deal — not just the last one.
        </p>
      </div>

      <div className="panel overflow-hidden">
        {scored.length === 0 ? (
          <p className="text-sm p-5" style={{ color: "var(--muted)" }}>No deals scored yet — process a call to see risk here.</p>
        ) : (
          <div className="flex flex-col">
            {scored.map((deal) => {
              const trend = trends.get(deal.id) ?? "new";
              return (
                <Link
                  key={deal.id}
                  href={`/deals/${deal.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 border-t"
                  style={{ borderColor: "var(--line-soft)" }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{deal.accountName}</div>
                    <div className="text-xs truncate" style={{ color: "var(--muted-2)" }}>{deal.stage.replace("_", " ")}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="mono text-xs" style={{ color: "var(--muted-2)" }} title={trend}>
                      {trendGlyph(trend)} {trend !== "new" ? trend : "no trend yet"}
                    </span>
                    <span className="mono text-sm tabular-nums">{deal.riskScore}/100</span>
                    <span className={`chip chip-${toneFor(deal.riskLabel ?? "low")}`}>{deal.riskLabel}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {unscored.length > 0 && (
        <div className="panel p-5">
          <h2 className="text-sm font-semibold mb-3">Not scored yet</h2>
          <div className="flex flex-col gap-1.5">
            {unscored.map((deal) => (
              <Link key={deal.id} href={`/deals/${deal.id}`} className="text-sm underline">
                {deal.accountName}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
