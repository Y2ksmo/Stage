import { NextResponse } from "next/server";
import { VoteValue } from "@prisma/client";
import { getAuthenticatedUserId } from "../../../../lib/auth";
import { HTTP_STATUS, VerificationError, VerificationService } from "../../../../services/verification";

const VOTES: readonly string[] = Object.values(VoteValue);

export async function POST(request: Request) {
  // Identity comes from the session, not the body (prevents voting as someone else).
  const reviewerId = await getAuthenticatedUserId(request);
  if (!reviewerId) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON." }, { status: 400 });
  }
  const { itemType, itemId, vote, rationale, hasDeclaredConflict } = body;

  if (typeof itemId !== "string" || !itemId || typeof vote !== "string" || !itemType) {
    return NextResponse.json({ error: "Ontbrekende verplichte velden: itemType, itemId, vote" }, { status: 400 });
  }
  if (itemType !== "CLAIM" && itemType !== "INCIDENT") {
    return NextResponse.json({ error: "Ongeldig itemType. Gebruik CLAIM of INCIDENT." }, { status: 400 });
  }
  if (!VOTES.includes(vote)) {
    return NextResponse.json({ error: `Ongeldige stem. Gebruik: ${VOTES.join(", ")}.` }, { status: 400 });
  }
  if (typeof rationale !== "string" || !rationale.trim()) {
    return NextResponse.json({ error: "Een onderbouwing (rationale) is verplicht." }, { status: 400 });
  }

  try {
    // castVote runs its own serializable transaction (vote + evaluation + score snapshot).
    const result = await VerificationService.castVote({
      reviewerId,
      targetType: itemType,
      targetId: itemId,
      value: vote as VoteValue,
      rationale: rationale.trim(),
      conflictDeclared: Boolean(hasDeclaredConflict),
    });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: HTTP_STATUS[error.code] });
    }
    // Serializable-transaction write conflict: safe for the client to retry.
    if ((error as { code?: string }).code === "P2034") {
      return NextResponse.json({ error: "Gelijktijdige stem verwerkt, probeer opnieuw." }, { status: 409 });
    }
    console.error("verification vote failed", error);
    return NextResponse.json({ error: "Interne serverfout bij verwerken stem." }, { status: 500 });
  }
}
