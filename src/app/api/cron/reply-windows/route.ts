import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processExpiredReplyWindows } from "../../../../services/replyWindows";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed when not configured
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Called by the scheduler (e.g. Vercel Cron, which sends `Authorization: Bearer $CRON_SECRET`). */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Niet geautoriseerd." }, { status: 401 });
  try {
    return NextResponse.json({ success: true, ...(await processExpiredReplyWindows()) });
  } catch (error) {
    console.error("reply-window cron failed", error);
    return NextResponse.json({ error: "Interne serverfout." }, { status: 500 });
  }
}
