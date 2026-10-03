import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { POST } from "../src/app/api/moderation/takedown/route";

const call = (body: unknown) =>
  POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));

async function main() {
  const tag = Date.now().toString();
  const mk = (n: string, role: "LEGAL" | "REVIEWER") => prisma.user.create({ data: { email: `${n}${tag}@t.io`, handle: `${n}${tag}`, role } });
  const [legal, rev] = await Promise.all([mk("lg", "LEGAL"), mk("rv", "REVIEWER")]);
  const leader = await prisma.leader.create({ data: { slug: `t${tag}`, displayName: "T", aliases: [], publicProfileUrls: [] } });
  const claim = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: rev.id, statementText: "q", dateMade: new Date(), sourceUrl: "https://a.example", state: "VERIFIED" } });
  const ok = { itemType: "CLAIM", itemId: claim.id, targetStatus: "DISPUTED", reason: "Subject disputes context" };

  delete process.env.PFPA_DEV_USER_ID;
  assert.equal((await call(ok)).status, 401);
  process.env.PFPA_DEV_USER_ID = rev.id;
  assert.equal((await call(ok)).status, 403); // reviewers cannot take down
  process.env.PFPA_DEV_USER_ID = legal.id;
  assert.equal((await call({ ...ok, targetStatus: "VERIFIED" })).status, 400);
  assert.equal((await call({ ...ok, reason: " " })).status, 400);
  assert.equal((await call({ ...ok, itemId: "nope" })).status, 404);

  const snapsBefore = await prisma.scoreSnapshot.count({ where: { leaderId: leader.id } });
  assert.equal((await call(ok)).status, 200);
  assert.equal((await prisma.claim.findUniqueOrThrow({ where: { id: claim.id } })).state, "DISPUTED");
  assert.equal(await prisma.scoreSnapshot.count({ where: { leaderId: leader.id } }), snapsBefore + 1); // rescored
  assert.equal(await prisma.moderationAction.count({ where: { targetId: claim.id, actorId: legal.id } }), 1); // audited
  assert.equal((await call(ok)).status, 409); // already disputed
  // linked public request: mismatched item rejected, matching one is resolved
  const other = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: rev.id, statementText: "o", dateMade: new Date(), sourceUrl: "https://b.example", state: "VERIFIED" } });
  const treq = await prisma.takedown.create({ data: { leaderId: leader.id, targetType: "CLAIM", targetId: other.id, grounds: "inaccurate", requesterEmail: "x@y.z" } });
  assert.equal((await call({ ...ok, itemId: claim.id, targetStatus: "WITHDRAWN", takedownRequestId: treq.id })).status, 400);
  assert.equal((await call({ ...ok, itemId: other.id, targetStatus: "WITHDRAWN", takedownRequestId: treq.id })).status, 200);
  const done = await prisma.takedown.findUniqueOrThrow({ where: { id: treq.id } });
  assert.equal(done.status, "UPHELD");
  assert.equal(done.decidedBy, legal.id);
  assert.equal((await call({ ...ok, itemId: other.id, targetStatus: "DISPUTED", takedownRequestId: treq.id })).status, 409); // withdrawn/resolved
  console.log("TAKEDOWN TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
