import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/calls/[id]/audio">) {
  const { id } = await ctx.params;
  const call = await db.call.findUnique({ where: { id } });
  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(call.recordingData), {
    headers: { "Content-Type": "audio/wav", "Content-Disposition": "inline" },
  });
}
