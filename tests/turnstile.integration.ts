import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { setTurnstileFetch, turnstileFailure, verifyTurnstile } from "../src/lib/turnstile";
import { setMailTransport } from "../src/services/notification";
import { POST as takedownRoute } from "../src/app/api/takedown-requests/route";
import { POST as loginRequestRoute } from "../src/app/api/auth/login/request/route";

const env = process.env as Record<string, string | undefined>;
const SITE = "http://site.example";
type Call = { url: string; params: URLSearchParams };

async function main() {
  const tag = Date.now().toString();
  env.APP_BASE_URL = "https://pfpa.example";
  delete env.PFPA_DEV_USER_ID;
  const calls: Call[] = [];
  // Stand-in for Cloudflare: "good-token" passes once; anything else fails; the mode switches simulate outages.
  let mode: "normal" | "http500" | "network" | "internal" = "normal";
  const spent = new Set<string>();
  setTurnstileFetch(async (url, init) => {
    calls.push({ url, params: init.body });
    if (mode === "network") throw new Error("ECONNRESET");
    if (mode === "http500") return { ok: false, json: async () => ({}) };
    if (mode === "internal") return { ok: true, json: async () => ({ success: false, "error-codes": ["internal-error"] }) };
    const token = init.body.get("response") ?? "";
    if (token.startsWith("good-") && !spent.has(token)) { spent.add(token); return { ok: true, json: async () => ({ success: true }) }; }
    return { ok: true, json: async () => ({ success: false, "error-codes": [spent.has(token) ? "timeout-or-duplicate" : "invalid-input-response"] }) };
  });

  // --- no secret: skipped in development, refused in production ---
  delete env.TURNSTILE_SECRET_KEY;
  assert.deepEqual(await verifyTurnstile(undefined), { ok: true, skipped: true });
  assert.equal(calls.length, 0);
  const nodeEnv = env.NODE_ENV;
  env.NODE_ENV = "production";
  assert.deepEqual(await verifyTurnstile("good-1"), { ok: false, reason: "NOT_CONFIGURED" });
  env.NODE_ENV = nodeEnv;

  // --- with a secret: the real request Cloudflare would receive ---
  env.TURNSTILE_SECRET_KEY = "secret-xyz";
  assert.deepEqual(await verifyTurnstile("good-1", "203.0.113.9"), { ok: true });
  assert.equal(calls[0].url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  assert.equal(calls[0].params.get("secret"), "secret-xyz");
  assert.equal(calls[0].params.get("response"), "good-1");
  assert.equal(calls[0].params.get("remoteip"), "203.0.113.9");
  // tokens are single use: replay is refused
  assert.deepEqual(await verifyTurnstile("good-1"), { ok: false, reason: "INVALID" });
  assert.deepEqual(await verifyTurnstile("forged"), { ok: false, reason: "INVALID" });
  // malformed / missing tokens never reach Cloudflare
  const before = calls.length;
  for (const bad of [undefined, null, "", 42, {}, "x".repeat(3000)]) assert.deepEqual(await verifyTurnstile(bad), { ok: false, reason: "MISSING" });
  assert.equal(calls.length, before);
  // outages fail closed (and say so differently from a bad token)
  mode = "http500"; assert.deepEqual(await verifyTurnstile("good-2"), { ok: false, reason: "UNAVAILABLE" });
  mode = "network"; assert.deepEqual(await verifyTurnstile("good-2"), { ok: false, reason: "UNAVAILABLE" });
  mode = "internal"; assert.deepEqual(await verifyTurnstile("good-2"), { ok: false, reason: "UNAVAILABLE" });
  mode = "normal";
  assert.equal(turnstileFailure({ ok: false, reason: "INVALID" }).status, 400);
  assert.equal(turnstileFailure({ ok: false, reason: "MISSING" }).status, 400);
  assert.equal(turnstileFailure({ ok: false, reason: "UNAVAILABLE" }).status, 503);
  assert.equal(turnstileFailure({ ok: false, reason: "NOT_CONFIGURED" }).status, 503);

  // --- takedown request route ---
  const sub = await prisma.user.create({ data: { email: `s${tag}@t.io`, handle: `s${tag}`, role: "CONTRIBUTOR" } });
  const leader = await prisma.leader.create({ data: { slug: `ts${tag}`, displayName: "TS", aliases: [], publicProfileUrls: [] } });
  const claim = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: "q", dateMade: new Date(), sourceUrl: "https://a.example", state: "VERIFIED" } });
  const td = (token: unknown, email = `req${tag}@org.example`) =>
    takedownRoute(new Request(`${SITE}/api/takedown-requests`, { method: "POST", body: JSON.stringify({ requesterEmail: email, targetType: "CLAIM", targetId: claim.id, grounds: "Onjuist", turnstileToken: token }) }));
  const count = () => prisma.takedown.count({ where: { targetId: claim.id } });

  assert.equal((await td(undefined)).status, 400);
  assert.equal((await td("forged")).status, 400);
  mode = "network"; assert.equal((await td("good-3")).status, 503);
  mode = "normal";
  assert.equal(await count(), 0, "nothing is stored unless the check passes");
  const ok = await td("good-4");
  assert.equal(ok.status, 201);
  assert.equal(await count(), 1);
  assert.equal((await td("good-4", `other${tag}@org.example`)).status, 400, "a spent token cannot be reused for another request");
  assert.equal(await count(), 1);

  // --- staff login request route ---
  const staff = await prisma.user.create({ data: { email: `st${tag}@org.example`, handle: `st${tag}`, role: "EDITOR" } });
  const mails: string[] = [];
  setMailTransport(async (m) => { mails.push(m.to); });
  const lr = (token: unknown, email: string) =>
    loginRequestRoute(new Request(`${SITE}/api/auth/login/request`, { method: "POST", headers: { origin: SITE }, body: JSON.stringify({ email, turnstileToken: token }) }));
  assert.equal((await lr(undefined, staff.email)).status, 400);
  assert.equal((await lr("forged", staff.email)).status, 400);
  assert.equal(mails.length, 0, "no email is sent when the check fails");
  const good = await lr("good-5", staff.email);
  assert.equal(good.status, 200);
  assert.equal(mails.length, 1);
  // the outcome of the check is independent of whether the address exists (no account oracle)
  const unknown = await lr("good-6", `nobody${tag}@org.example`);
  assert.equal(unknown.status, 200);
  assert.deepEqual(await good.json(), await unknown.json());
  assert.equal((await lr("forged", `nobody${tag}@org.example`)).status, 400);
  assert.equal((await lr("forged", staff.email)).status, 400);

  setTurnstileFetch(null);
  delete env.TURNSTILE_SECRET_KEY;
  console.log("TURNSTILE TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
