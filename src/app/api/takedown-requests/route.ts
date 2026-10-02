import { NextResponse } from "next/server";
import { errorResponse, readJson } from "../../../lib/http";
import { submitPublicTakedown } from "../../../services/takedownRequest";

/** Public endpoint: no login required. */
export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Ongeldige JSON." }, { status: 400 });
  const { requesterEmail, requesterName, targetType, targetId, grounds, evidenceUrls } = body;

  if (
    typeof requesterEmail !== "string" || typeof targetId !== "string" || !targetId ||
    typeof grounds !== "string" || typeof targetType !== "string" ||
    (requesterName !== undefined && typeof requesterName !== "string") ||
    (evidenceUrls !== undefined && (!Array.isArray(evidenceUrls) || evidenceUrls.some((u) => typeof u !== "string")))
  ) {
    return NextResponse.json(
      { error: "Verplichte velden: requesterEmail, targetType, targetId, grounds." },
      { status: 400 },
    );
  }

  try {
    const created = await submitPublicTakedown({
      requesterEmail,
      requesterName: requesterName as string | undefined,
      targetType: targetType as "CLAIM" | "INCIDENT" | "LEADER",
      targetId,
      grounds,
      evidenceUrls: evidenceUrls as string[] | undefined,
    });
    return NextResponse.json(
      { success: true, requestId: created.id, status: created.status, message: "Uw verzoek is ontvangen en wordt beoordeeld." },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e, "submit takedown failed");
  }
}
