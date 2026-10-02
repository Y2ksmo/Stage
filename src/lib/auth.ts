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

/**
 * Resolve the authenticated user id from `Authorization: Bearer <token>`, or null.
 * Authorisation (roles) is enforced by the services; this only answers "who is calling".
 * The reviewer/actor identity must NEVER come from the request body.
 *
 * A session is valid only while: it exists, is not revoked, has not expired, and the user is not suspended.
 * The dev bypass (PFPA_DEV_USER_ID) is ignored when NODE_ENV === "production".
 */
export async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  if (process.env.NODE_ENV !== "production" && process.env.PFPA_DEV_USER_ID) {
    return process.env.PFPA_DEV_USER_ID;
  }

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (token.length < 20) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiresAt: true, revokedAt: true, user: { select: { id: true, suspendedUntil: true } } },
  });
  const now = new Date();
  if (!session || session.revokedAt || session.expiresAt <= now) return null;
  if (session.user.suspendedUntil && session.user.suspendedUntil > now) return null;
  return session.user.id;
}
