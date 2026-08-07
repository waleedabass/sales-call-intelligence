import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordingsDir } from "@/lib/storage";

export async function GET(_req: Request, ctx: RouteContext<"/api/calls/[id]/audio">) {
  const { id } = await ctx.params;
  const call = await db.call.findUnique({ where: { id } });
  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

  const bytes = await readFile(path.join(recordingsDir(), call.recordingPath));
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": "audio/wav", "Content-Disposition": "inline" },
  });
}
