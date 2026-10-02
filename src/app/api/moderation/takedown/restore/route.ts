import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "../../../../../lib/auth";
import { errorResponse, readJson } from "../../../../../lib/http";
import { restoreDisputedItem } from "../../../../../services/takedown";

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: "Niet geauthenticeerd." }, { status: 401 });
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Ongeldige JSON." }, { status: 400 });
  const { itemType, itemId, reason, takedownRequestId } = body;
  if (typeof itemId !== "string" || !itemId || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "Ontbrekende verplichte velden: itemType, itemId, reason" }, { status: 400 });
  }
  if (itemType !== "CLAIM" && itemType !== "INCIDENT") {
    return NextResponse.json({ error: "Ongeldig itemType. Gebruik CLAIM of INCIDENT." }, { status: 400 });
  }
  if (takedownRequestId !== undefined && (typeof takedownRequestId !== "string" || !takedownRequestId)) {
    return NextResponse.json({ error: "Ongeldig takedownRequestId." }, { status: 400 });
  }
  try {
    const result = await restoreDisputedItem({
      userId, targetType: itemType, targetId: itemId, reason: reason.trim(),
      takedownRequestId: takedownRequestId as string | undefined,
    });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    return errorResponse(e, "restore failed");
  }
}
