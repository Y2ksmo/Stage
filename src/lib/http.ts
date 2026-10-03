import { NextResponse } from "next/server";
import { HTTP_STATUS, VerificationError } from "../services/verification";

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await request.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function errorResponse(error: unknown, label: string) {
  if (error instanceof VerificationError) {
    return NextResponse.json({ error: error.message }, { status: HTTP_STATUS[error.code] });
  }
  if ((error as { code?: string }).code === "P2034") {
    return NextResponse.json({ error: "Gelijktijdige wijziging, probeer opnieuw." }, { status: 409 });
  }
  console.error(label, error);
  return NextResponse.json({ error: "Interne serverfout." }, { status: 500 });
}
