import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { SESSION_COOKIE, createSession, getAuthenticatedUserId, isSameOriginRequest } from "../src/lib/auth";
import { DELETE as logout, POST as login } from "../src/app/api/auth/session/route";
import { GET as listPending } from "../src/app/api/moderation/reply-review/route";

const env = process.env as Record<string, string | undefined>;
const SITE = "http://site.example";
const mk = (method: string, headers: Record<string, string> = {}, body?: unknown) =>
  new Request(`${SITE}/api/x`, { method, headers: { "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });

async function main() {
  const tag = Date.now().toString();
  const editor = await prisma.user.create({ data: { email: `e${tag}@t.io`, handle: `e${tag}`, role: "EDITOR" } });
  delete env.PFPA_DEV_USER_ID;
  delete env.APP_BASE_URL;
  const { token } = await createSession(editor.id);
  const cookie = { cookie: `other=1; ${SESSION_COOKIE}=${token}; x=y` };

  // CSRF rules (pure)
  assert.equal(isSameOriginRequest(mk("GET")), true);
  assert.equal(isSameOriginRequest(mk("POST")), false); // no Origin
  assert.equal(isSameOriginRequest(mk("POST", { origin: "http://evil.example" })), false);
  assert.equal(isSameOriginRequest(mk("POST", { origin: SITE, "sec-fetch-site": "cross-site" })), false);
  assert.equal(isSameOriginRequest(mk("POST", { origin: SITE })), true);
  env.APP_BASE_URL = "https://pfpa.example";
  assert.equal(isSameOriginRequest(mk("POST", { origin: "https://pfpa.example" })), true); // configured public origin
  delete env.APP_BASE_URL;

  // cookie auth: reads work; writes need same-origin; garbage cookies are ignored
  assert.equal(await getAuthenticatedUserId(mk("GET", cookie)), editor.id);
  assert.equal(await getAuthenticatedUserId(mk("POST", cookie)), null);
  assert.equal(await getAuthenticatedUserId(mk("POST", { ...cookie, origin: "http://evil.example" })), null);
  assert.equal(await getAuthenticatedUserId(mk("POST", { ...cookie, origin: SITE })), editor.id);
  assert.equal(await getAuthenticatedUserId(mk("GET", { cookie: `${SESSION_COOKIE}=${"x".repeat(43)}` })), null);
  assert.equal(await getAuthenticatedUserId(mk("GET", { cookie: `${SESSION_COOKIE}=` })), null);
  // bearer tokens are not cookie-attached by browsers, so no Origin is required
  assert.equal(await getAuthenticatedUserId(mk("POST", { authorization: `Bearer ${token}` })), editor.id);

  // a real route accepts the cookie
  assert.equal((await listPending(mk("GET", cookie))).status, 200);
  assert.equal((await listPending(mk("GET"))).status, 401);

  // login: same-origin only, valid token only, sets an HttpOnly + SameSite=Strict cookie
  assert.equal((await login(mk("POST", {}, { token }))).status, 403);
  assert.equal((await login(mk("POST", { origin: "http://evil.example" }, { token }))).status, 403);
  assert.equal((await login(mk("POST", { origin: SITE }, { token: "nope".repeat(10) }))).status, 401);
  assert.equal((await login(mk("POST", { origin: SITE }, {}))).status, 401);
  const ok = await login(mk("POST", { origin: SITE }, { token }));
  assert.equal(ok.status, 200);
  const setCookie = ok.headers.get("set-cookie") ?? "";
  assert.match(setCookie, new RegExp(`^${SESSION_COOKIE}=${token}`));
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=strict/i);
  assert.match(setCookie, /Expires=/i);

  // logout: needs same-origin, revokes server-side, clears cookie
  assert.equal((await logout(mk("DELETE", cookie))).status, 403);
  const out = await logout(mk("DELETE", { ...cookie, origin: SITE }));
  assert.equal(out.status, 200);
  assert.match(out.headers.get("set-cookie") ?? "", /Max-Age=0/i);
  assert.equal(await getAuthenticatedUserId(mk("GET", cookie)), null); // the token itself is dead now
  assert.equal(await getAuthenticatedUserId(mk("GET", { authorization: `Bearer ${token}` })), null);
  console.log("COOKIE AUTH TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
