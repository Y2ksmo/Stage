import { NextResponse } from "next/server";
import { SESSION_COOKIE, isSameOriginRequest, resolveSessionToken, revokeSession, sessionCookieOptions } from "../../../../lib/auth";
import { readJson } from "../../../../lib/http";

const cookieBase = sessionCookieOptions;

/**
 * Interim staff login: exchange a session token (minted by `npm run session:create`) for an HttpOnly cookie.
 * Replace the token step with a real login (magic link / OAuth) later; the cookie handling stays the same.
 */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Verzoek geweigerd." }, { status: 403 });
  const body = await readJson(request);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const session = token ? await resolveSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Ongeldige of verlopen token." }, { status: 401 });

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, token, { ...cookieBase(), expires: session.expiresAt });
  return res;
}

/** Log out: revoke the session server-side and clear the cookie. */
export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Verzoek geweigerd." }, { status: 403 });
  const match = (request.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (match) await revokeSession(decodeURIComponent(match[1]));
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieBase(), maxAge: 0 });
  return res;
}
