import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "../../../../../lib/auth";
import { errorResponse, readJson } from "../../../../../lib/http";
import { rejectTakedownRequest } from "../../../../../services/takedown";

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: "Niet geauthenticeerd." }, { status: 401 });
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Ongeldige JSON." }, { status: 400 });
  const { takedownRequestId, reason } = body;
  if (typeof takedownRequestId !== "string" || !takedownRequestId || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ error: "Ontbrekende verplichte velden: takedownRequestId, reason" }, { status: 400 });
  }
  try {
    const result = await rejectTakedownRequest({ userId, takedownRequestId, reason: reason.trim() });
    return NextResponse.json({ success: true, result });
  } catch (e) {
    return errorResponse(e, "reject takedown failed");
  }
}
