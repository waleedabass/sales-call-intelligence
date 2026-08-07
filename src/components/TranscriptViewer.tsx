"use client";

import { useRef, useState } from "react";
import { formatTimestamp } from "@/lib/format";

export interface SegmentTag {
  kind: "objection" | "commitment" | "competitor" | "next_step";
  label: string;
}

export interface ViewerSegment {
  id: string;
  speaker: string;
  startSec: number;
  endSec: number;
  text: string;
  tags: SegmentTag[];
}

const TAG_STYLE: Record<SegmentTag["kind"], { chipClass: string; label: string }> = {
  objection: { chipClass: "chip-warn", label: "Objection" },
  commitment: { chipClass: "chip-info", label: "Commitment" },
  competitor: { chipClass: "chip-danger", label: "Competitor" },
  next_step: { chipClass: "chip-good", label: "Next step" },
};

export function TranscriptViewer({ callId, segments }: { callId: string; segments: ViewerSegment[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const seekTo = (segment: ViewerSegment) => {
    setActiveId(segment.id);
    if (audioRef.current) {
      audioRef.current.currentTime = segment.startSec;
      audioRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <audio ref={audioRef} controls className="w-full" src={`/api/calls/${callId}/audio`}>
        Your browser does not support audio playback.
      </audio>

      <div className="panel overflow-hidden">
        <div className="flex flex-col divide-y" style={{ borderColor: "var(--line-soft)" }}>
          {segments.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => seekTo(s)}
              className="text-left px-4 py-3 flex flex-col gap-1.5 transition-colors"
              style={{
                borderTop: "1px solid var(--line-soft)",
                background: activeId === s.id ? "var(--panel-2)" : "transparent",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="mono text-xs" style={{ color: "var(--muted-2)" }}>
                  {formatTimestamp(s.startSec)}
                </span>
                <span
                  className="mono text-xs uppercase tracking-wide px-1.5 py-0.5 rounded"
                  style={{
                    color: s.speaker === "rep" ? "var(--text)" : "var(--muted)",
                    background: s.speaker === "rep" ? "var(--accent)" : "var(--panel-2)",
                  }}
                >
                  {s.speaker}
                </span>
                {s.tags.map((t, i) => (
                  <span key={i} className={`chip ${TAG_STYLE[t.kind].chipClass}`}>
                    {TAG_STYLE[t.kind].label}
                  </span>
                ))}
              </div>
              <p className="text-sm">{s.text}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
