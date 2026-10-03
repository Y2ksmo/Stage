import { NextResponse } from "next/server";
import { SESSION_COOKIE, isSameOriginRequest, sessionCookieOptions } from "../../../../../lib/auth";
import { readJson } from "../../../../../lib/http";
import { loginWithCode, loginWithToken } from "../../../../../lib/loginTokens";

/** Body: { token } (magic link, from the confirm page) or { email, code } (6-digit code). */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Verzoek geweigerd." }, { status: 403 });
  const body = await readJson(request);
  if (!body) return NextResponse.json({ error: "Ongeldige JSON." }, { status: 400 });

  const meta = {
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
  const result =
    typeof body.token === "string" ? await loginWithToken(body.token, meta)
    : typeof body.email === "string" && typeof body.code === "string" ? await loginWithCode(body.email, body.code, meta)
    : null;

  // One message for every failure (wrong, expired, used, unknown address): nothing to learn from it.
  if (!result) return NextResponse.json({ error: "Ongeldige of verlopen inlogcode of link." }, { status: 401 });

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, result.sessionToken, { ...sessionCookieOptions(), expires: result.expiresAt });
  return res;
}
