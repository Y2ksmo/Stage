import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { createSession, getAuthenticatedUserId, revokeAllSessions, revokeSession } from "../src/lib/auth";
import { POST as vote } from "../src/app/api/verification/vote/route";

const env = process.env as Record<string, string | undefined>;
const req = (token?: string, extra: Record<string, string> = {}) =>
  new Request("http://x", { method: "POST", headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra }, body: "{}" });

async function main() {
  const tag = Date.now().toString();
  const mk = (n: string, role: "REVIEWER" | "CONTRIBUTOR") => prisma.user.create({ data: { email: `${n}${tag}@t.io`, handle: `${n}${tag}`, role } });
  const [rev, sub] = await Promise.all([mk("r", "REVIEWER"), mk("s", "CONTRIBUTOR")]);
  delete env.PFPA_DEV_USER_ID;

  // valid session -> user id; only the hash is stored
  const { token, expiresAt } = await createSession(rev.id);
  assert.equal(await getAuthenticatedUserId(req(token)), rev.id);
  const stored = await prisma.session.findFirstOrThrow({ where: { userId: rev.id } });
  assert.notEqual(stored.tokenHash, token);
  assert.ok(expiresAt.getTime() > Date.now() + 11 * 3600 * 1000);

  // missing / malformed / unknown / wrong-scheme tokens
  assert.equal(await getAuthenticatedUserId(req()), null);
  assert.equal(await getAuthenticatedUserId(req("short")), null);
  assert.equal(await getAuthenticatedUserId(req("x".repeat(43))), null);
  assert.equal(await getAuthenticatedUserId(new Request("http://x", { headers: { authorization: `Basic ${token}` } })), null);

  // expiry, revocation, suspension
  const exp = await createSession(rev.id, 1);
  await prisma.session.updateMany({ where: { tokenHash: (await prisma.session.findMany({ orderBy: { createdAt: "desc" }, take: 1, where: { userId: rev.id } }))[0].tokenHash }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal(await getAuthenticatedUserId(req(exp.token)), null);
  const rv = await createSession(rev.id);
  assert.equal(await getAuthenticatedUserId(req(rv.token)), rev.id);
  await revokeSession(rv.token);
  assert.equal(await getAuthenticatedUserId(req(rv.token)), null);
  assert.equal(await getAuthenticatedUserId(req(token)), rev.id); // other sessions unaffected
  await prisma.user.update({ where: { id: rev.id }, data: { suspendedUntil: new Date(Date.now() + 3600_000) } });
  assert.equal(await getAuthenticatedUserId(req(token)), null); // suspended users lose access immediately
  await assert.rejects(createSession(rev.id), /suspended/);
  await prisma.user.update({ where: { id: rev.id }, data: { suspendedUntil: null } });
  await revokeAllSessions(rev.id);
  assert.equal(await getAuthenticatedUserId(req(token)), null);

  // dev bypass works outside production, and is ignored in production
  env.PFPA_DEV_USER_ID = sub.id;
  assert.equal(await getAuthenticatedUserId(req()), sub.id);
  const nodeEnv = env.NODE_ENV;
  env.NODE_ENV = "production";
  assert.equal(await getAuthenticatedUserId(req()), null);
  env.NODE_ENV = nodeEnv;
  delete env.PFPA_DEV_USER_ID;

  // end to end: a real bearer token authorises a route; no token is 401
  const leader = await prisma.leader.create({ data: { slug: `a${tag}`, displayName: "A", aliases: [], publicProfileUrls: [] } });
  const claim = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: "q", dateMade: new Date(), sourceUrl: "https://a.example", state: "IN_REVIEW" } });
  const live = await createSession(rev.id);
  const body = JSON.stringify({ itemType: "CLAIM", itemId: claim.id, vote: "CONFIRM", rationale: "ok" });
  const call = (t?: string) => vote(new Request("http://x", { method: "POST", headers: t ? { authorization: `Bearer ${t}` } : {}, body }));
  assert.equal((await call()).status, 401);
  assert.equal((await call(live.token)).status, 200);
  console.log("AUTH TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
