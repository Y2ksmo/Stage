import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "../../../../lib/auth";
import { errorResponse, readJson } from "../../../../lib/http";
import { startReplyWindowAndNotify } from "../../../../services/rightOfReply";

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: "Niet geauthenticeerd." }, { status: 401 });
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Ongeldige JSON." }, { status: 400 });
  const { itemType, itemId, recipientEmail } = body;
  if (typeof itemId !== "string" || !itemId) {
    return NextResponse.json({ error: "Ontbrekende verplichte velden: itemType, itemId" }, { status: 400 });
  }
  if (itemType !== "CLAIM" && itemType !== "INCIDENT") {
    return NextResponse.json({ error: "Ongeldig itemType. Gebruik CLAIM of INCIDENT." }, { status: 400 });
  }
  if (recipientEmail !== undefined && typeof recipientEmail !== "string") {
    return NextResponse.json({ error: "Ongeldig recipientEmail." }, { status: 400 });
  }
  try {
    const result = await startReplyWindowAndNotify({ itemType, itemId, userId, recipientEmail });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    return errorResponse(e, "trigger right of reply failed");
  }
}
