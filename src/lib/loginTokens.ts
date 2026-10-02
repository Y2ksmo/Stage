import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma";
import { createSession } from "./auth";
import { NotificationService } from "../services/notification";

export const LOGIN_TTL_MINUTES = 15;
const MAX_CODE_ATTEMPTS = 5;
const MAX_REQUESTS_PER_HOUR = 5;
const STAFF_ROLES = ["REVIEWER", "EDITOR", "LEGAL", "ADMIN"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Keyed hash. A 6-digit code has only 1,000,000 possibilities, so a plain hash would be reversible in
 * milliseconds if the table ever leaked; the server secret makes the stored value useless without it.
 */
function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set in production.");
  return s ?? "dev-only-insecure-secret";
}
const mac = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export interface RequestMeta { ipAddress?: string | null; userAgent?: string | null }

async function findStaffByEmail(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return null;
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true, email: true, role: true, suspendedUntil: true } });
  if (!user || !(STAFF_ROLES as readonly string[]).includes(user.role)) return null;
  if (user.suspendedUntil && user.suspendedUntil > new Date()) return null;
  return user;
}

/**
 * Start an email login. ALWAYS resolves the same way whether or not the address belongs to a staff member
 * (no account enumeration): callers show a generic "if this address is known, a message was sent".
 * Only staff roles that are not suspended get a code. At most 5 codes per hour per account; a new code
 * cancels earlier unused ones, so only the latest is ever valid.
 */
export async function requestLogin(email: string, meta: RequestMeta = {}): Promise<void> {
  secret(); // fail closed for EVERY address when misconfigured; an error only for real accounts would reveal them
  const user = await findStaffByEmail(email);
  if (!user) return;

  const recent = await prisma.loginToken.count({ where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 3600_000) } } });
  if (recent >= MAX_REQUESTS_PER_HOUR) return;

  const token = randomBytes(32).toString("base64url");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();

  await prisma.$transaction([
    prisma.loginToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } }),
    prisma.loginToken.create({
      data: {
        userId: user.id, tokenHash: mac(token), otpHash: mac(`otp:${code}`),
        expiresAt: new Date(now.getTime() + LOGIN_TTL_MINUTES * 60_000),
        ipAddress: meta.ipAddress?.slice(0, 64) ?? null, userAgent: meta.userAgent?.slice(0, 300) ?? null,
      },
    }),
  ]);

  try {
    await NotificationService.sendLoginEmail({ recipientEmail: user.email, code, token, minutes: LOGIN_TTL_MINUTES });
  } catch (error) {
    // Never reveal a delivery failure to the caller: it would confirm the address exists.
    console.error("login email failed", error instanceof Error ? error.message : error);
  }
}

export interface LoginResult { userId: string; sessionToken: string; expiresAt: Date }

/** Turn a verified token row into a session. A row can be used exactly once, even under a race. */
async function finish(row: { id: string; userId: string }, meta: RequestMeta): Promise<LoginResult | null> {
  const used = await prisma.loginToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (used.count === 0) return null;
  let session;
  try {
    session = await createSession(row.userId);
  } catch {
    return null; // suspended in the meantime
  }
  await prisma.moderationAction.create({
    data: { actorId: row.userId, action: "STAFF_LOGIN", targetType: "USER", targetId: row.userId, reason: `Email login${meta.ipAddress ? ` from ${meta.ipAddress.slice(0, 64)}` : ""}` },
  });
  return { userId: row.userId, sessionToken: session.token, expiresAt: session.expiresAt };
}

/** Log in with the magic-link token (from the confirm page). */
export async function loginWithToken(token: string, meta: RequestMeta = {}): Promise<LoginResult | null> {
  if (typeof token !== "string" || token.length < 20) return null;
  const row = await prisma.loginToken.findUnique({ where: { tokenHash: mac(token) } });
  if (!row || row.usedAt || row.expiresAt <= new Date()) return null;
  return finish(row, meta);
}

/** Log in with the 6-digit code plus the email address. Wrong guesses burn the code after 5 tries. */
export async function loginWithCode(email: string, code: string, meta: RequestMeta = {}): Promise<LoginResult | null> {
  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) return null;
  const user = await findStaffByEmail(email);
  if (!user) return null;

  const row = await prisma.loginToken.findFirst({ where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!row || row.attempts >= MAX_CODE_ATTEMPTS) return null;

  if (!same(row.otpHash, mac(`otp:${code.trim()}`))) {
    const attempts = row.attempts + 1;
    await prisma.loginToken.update({ where: { id: row.id }, data: { attempts, ...(attempts >= MAX_CODE_ATTEMPTS ? { usedAt: new Date() } : {}) } });
    return null;
  }
  return finish(row, meta);
}
