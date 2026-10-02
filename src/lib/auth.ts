import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";

const DEFAULT_TTL_HOURS = 12;

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/**
 * Create a login session and return the bearer token ONCE. Only its SHA-256 is stored, so a database
 * leak does not expose usable sessions. Call this from your login flow (OAuth / magic link / password).
 */
export async function createSession(userId: string, ttlHours = DEFAULT_TTL_HOURS) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { suspendedUntil: true } });
  if (!user) throw new Error("User not found.");
  if (user.suspendedUntil && user.suspendedUntil > new Date()) throw new Error("Account suspended.");

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  return { token, expiresAt };
}

/** Revoke one session by its token (logout). Idempotent. */
export async function revokeSession(token: string) {
  await prisma.session.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
}

/** Revoke every active session of a user (e.g. on suspension or role change). */
export async function revokeAllSessions(userId: string) {
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export const SESSION_COOKIE = "pfpa_session";

/** Validate a raw session token. Returns the user id and expiry, or null (unknown/revoked/expired/suspended). */
export async function resolveSessionToken(token: string): Promise<{ userId: string; expiresAt: Date } | null> {
  if (typeof token !== "string" || token.length < 20) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiresAt: true, revokedAt: true, user: { select: { id: true, suspendedUntil: true } } },
  });
  const now = new Date();
  if (!session || session.revokedAt || session.expiresAt <= now) return null;
  if (session.user.suspendedUntil && session.user.suspendedUntil > now) return null;
  return { userId: session.user.id, expiresAt: session.expiresAt };
}

function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/**
 * CSRF defence for requests authorised by a cookie (browsers attach cookies automatically, bearer tokens
 * they do not). Unsafe methods must be same-origin: the Origin header must match this site, and a browser
 * that reports Sec-Fetch-Site: cross-site is refused outright. Requests with no Origin are refused.
 */
export function isSameOriginRequest(request: Request): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set<string>([new URL(request.url).origin]);
  try {
    if (process.env.APP_BASE_URL) allowed.add(new URL(process.env.APP_BASE_URL).origin);
  } catch {
    /* ignore malformed APP_BASE_URL */
  }
  return allowed.has(origin);
}

/**
 * Resolve the authenticated user id, or null. Accepts `Authorization: Bearer <token>` (API clients) or the
 * HttpOnly session cookie (staff UI; unsafe methods additionally need a same-origin request, see above).
 * Authorisation (roles) is enforced by the services; this only answers "who is calling".
 * The actor identity must NEVER come from the request body.
 *
 * The dev bypass (PFPA_DEV_USER_ID) is ignored when NODE_ENV === "production".
 */
export async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  if (process.env.NODE_ENV !== "production" && process.env.PFPA_DEV_USER_ID) {
    return process.env.PFPA_DEV_USER_ID;
  }

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Bearer ")) return (await resolveSessionToken(header.slice(7).trim()))?.userId ?? null;

  const cookie = readCookie(request, SESSION_COOKIE);
  if (cookie) {
    if (!isSameOriginRequest(request)) return null;
    return (await resolveSessionToken(cookie))?.userId ?? null;
  }
  return null;
}
