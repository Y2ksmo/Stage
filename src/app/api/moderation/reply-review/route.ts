import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "../../../../lib/auth";
import { errorResponse, readJson } from "../../../../lib/http";
import { listPendingReplies, reviewSubjectReply } from "../../../../services/rightOfReply";

/** Pending replies awaiting editorial review (EDITOR / LEGAL / ADMIN). */
export async function GET(request: Request) {
  const actorId = await getAuthenticatedUserId(request);
  if (!actorId) return NextResponse.json({ error: "Niet geauthenticeerd." }, { status: 401 });
  try {
    return NextResponse.json({ success: true, replies: await listPendingReplies(actorId) });
  } catch (e) {
    return errorResponse(e, "list pending replies failed");
  }
}

/** Approve (publish) or reject (withhold) a subject's reply. */
export async function POST(request: Request) {
  const actorId = await getAuthenticatedUserId(request);
  if (!actorId) return NextResponse.json({ error: "Niet geauthenticeerd." }, { status: 401 });
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Ongeldige JSON." }, { status: 400 });
  const { replyId, decision, notes } = body;
  if (typeof replyId !== "string" || !replyId || (decision !== "APPROVED" && decision !== "REJECTED")) {
    return NextResponse.json({ error: "Verplichte velden: replyId, decision (APPROVED of REJECTED)." }, { status: 400 });
  }
  if (notes !== undefined && typeof notes !== "string") {
    return NextResponse.json({ error: "Ongeldige notes." }, { status: 400 });
  }
  try {
    const result = await reviewSubjectReply({ actorId, replyId, decision, notes });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    return errorResponse(e, "review reply failed");
  }
}
