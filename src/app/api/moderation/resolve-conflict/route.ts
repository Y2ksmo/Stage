import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "../../../../lib/auth";
import { errorResponse, readJson } from "../../../../lib/http";
import { resolveConflictingVotes } from "../../../../services/conflictResolution";

export async function POST(request: Request) {
  const editorId = await getAuthenticatedUserId(request);
  if (!editorId) return NextResponse.json({ error: "Niet geauthenticeerd." }, { status: 401 });
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Ongeldige JSON." }, { status: 400 });

  const { itemType, itemId, decision, rationale, noConflict } = body;
  if (typeof itemId !== "string" || !itemId || (itemType !== "CLAIM" && itemType !== "INCIDENT") || (decision !== "CONFIRM" && decision !== "REJECT") || typeof rationale !== "string") {
    return NextResponse.json({ error: "Verplichte velden: itemType (CLAIM of INCIDENT), itemId, decision (CONFIRM of REJECT), rationale." }, { status: 400 });
  }
  try {
    const result = await resolveConflictingVotes({ editorId, itemType, itemId, decision, rationale, noConflict: noConflict === true });
    return NextResponse.json({ success: true, result: { state: result.state, reason: result.reason, missing: result.missing } });
  } catch (e) {
    return errorResponse(e, "resolve conflict failed");
  }
}
