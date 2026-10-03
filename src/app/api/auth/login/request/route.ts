import { NextResponse } from "next/server";
import { isSameOriginRequest } from "../../../../../lib/auth";
import { readJson } from "../../../../../lib/http";
import { requestLogin } from "../../../../../lib/loginTokens";
import { turnstileFailure, verifyTurnstile } from "../../../../../lib/turnstile";

const GENERIC = { success: true, message: "Als dit e-mailadres bij ons bekend is, hebben wij een inlogcode gestuurd." };

/** Always answers identically for any well-formed request: it never reveals which addresses are staff accounts. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Verzoek geweigerd." }, { status: 403 });
  const body = await readJson(request);
  if (!body || typeof body.email !== "string" || body.email.length > 254) return NextResponse.json({ error: "Geef een e-mailadres op." }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  // The bot check outcome never depends on whether the address exists, so it leaks nothing about accounts.
  const human = await verifyTurnstile(body.turnstileToken, ip);
  if (!human.ok) {
    const f = turnstileFailure(human);
    return NextResponse.json({ error: f.error }, { status: f.status });
  }
  await requestLogin(body.email, {
    ipAddress: ip,
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json(GENERIC);
}
