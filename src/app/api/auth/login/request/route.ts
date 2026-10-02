import { NextResponse } from "next/server";
import { isSameOriginRequest } from "../../../../../lib/auth";
import { readJson } from "../../../../../lib/http";
import { requestLogin } from "../../../../../lib/loginTokens";

const GENERIC = { success: true, message: "Als dit e-mailadres bij ons bekend is, hebben wij een inlogcode gestuurd." };

/** Always answers identically for any well-formed request: it never reveals which addresses are staff accounts. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Verzoek geweigerd." }, { status: 403 });
  const body = await readJson(request);
  if (!body || typeof body.email !== "string" || body.email.length > 254) return NextResponse.json({ error: "Geef een e-mailadres op." }, { status: 400 });
  await requestLogin(body.email, {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json(GENERIC);
}
