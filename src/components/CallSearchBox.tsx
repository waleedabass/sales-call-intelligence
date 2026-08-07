"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { searchCallsAction } from "@/lib/actions";
import type { CallSearchResult } from "@/lib/search";
import { formatTimestamp } from "@/lib/format";

export function CallSearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CallSearchResult[] | null>(null);
  const [isPending, startTransition] = useTransition();

  const runSearch = (q: string) => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    startTransition(async () => {
      const r = await searchCallsAction(q);
      setResults(r);
    });
  };

  return (
    <div className="panel p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search calls semantically — try “pricing objection” or “security concern”"
          className="field"
        />
        <button type="submit" className="btn btn-primary shrink-0" disabled={isPending}>
          {isPending ? "Searching…" : "Search"}
        </button>
      </form>

      {results !== null && (
        <div className="mt-4 flex flex-col gap-2">
          {results.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>No matching moments found.</p>
          ) : (
            results.map((r) => (
              <Link
                key={r.segmentId}
                href={`/calls/${r.callId}`}
                className="text-sm flex items-start justify-between gap-3 py-2 border-t"
                style={{ borderColor: "var(--line-soft)" }}
              >
                <span>
                  <span className="mono text-xs uppercase mr-2" style={{ color: "var(--muted-2)" }}>
                    [{r.speaker}] {formatTimestamp(r.startSec)}
                  </span>
                  {r.text}
                </span>
                <span className="mono text-xs shrink-0" style={{ color: "var(--muted-2)" }}>
                  {r.dealAccountName} · {r.score.toFixed(2)}
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
