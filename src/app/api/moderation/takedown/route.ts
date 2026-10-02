import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "../../../../lib/auth";
import { applyTakedownAction } from "../../../../services/takedown";
import { HTTP_STATUS, VerificationError } from "../../../../services/verification";

export async function POST(request: Request) {
  const actorId = await getAuthenticatedUserId(request);
  if (!actorId) return NextResponse.json({ error: "Niet geauthenticeerd." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON." }, { status: 400 });
  }
  const { itemType, itemId, targetStatus, reason } = body;

  if (typeof itemId !== "string" || !itemId || typeof reason !== "string" || !reason.trim() || !itemType || !targetStatus) {
    return NextResponse.json(
      { error: "Ontbrekende verplichte velden: itemType, itemId, targetStatus, reason" },
      { status: 400 },
    );
  }
  if (itemType !== "CLAIM" && itemType !== "INCIDENT") {
    return NextResponse.json({ error: "Ongeldig itemType. Gebruik CLAIM of INCIDENT." }, { status: 400 });
  }
  if (targetStatus !== "DISPUTED" && targetStatus !== "WITHDRAWN") {
    return NextResponse.json({ error: "Takedown status moet DISPUTED of WITHDRAWN zijn." }, { status: 400 });
  }

  try {
    const result = await applyTakedownAction({
      actorId,
      targetType: itemType,
      targetId: itemId,
      targetState: targetStatus,
      reason: reason.trim(),
    });
    return NextResponse.json({ success: true, message: `Item succesvol op ${targetStatus} gezet.`, result });
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: HTTP_STATUS[error.code] });
    }
    if ((error as { code?: string }).code === "P2034") {
      return NextResponse.json({ error: "Gelijktijdige wijziging, probeer opnieuw." }, { status: 409 });
    }
    console.error("Fout bij verwerken takedown:", error);
    return NextResponse.json({ error: "Interne serverfout bij verwerken takedown." }, { status: 500 });
  }
}
