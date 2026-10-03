import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { POST } from "../src/app/api/verification/vote/route";

const call = (body: unknown) =>
  POST(new Request("http://x/api/verification/vote", { method: "POST", body: JSON.stringify(body) }));

async function main() {
  const tag = Date.now().toString();
  const sub = await prisma.user.create({ data: { email: `s${tag}@t.io`, handle: `s${tag}`, role: "REVIEWER" } });
  const rev = await prisma.user.create({ data: { email: `r${tag}@t.io`, handle: `r${tag}`, role: "REVIEWER" } });
  const leader = await prisma.leader.create({ data: { slug: `l${tag}`, displayName: "L", aliases: [], publicProfileUrls: [] } });
  const claim = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: "q", dateMade: new Date(), sourceUrl: "https://a.example", state: "IN_REVIEW" } });
  const ok = { itemType: "CLAIM", itemId: claim.id, vote: "CONFIRM", rationale: "checked" };

  delete process.env.PFPA_DEV_USER_ID;
  assert.equal((await call(ok)).status, 401); // unauthenticated
  process.env.PFPA_DEV_USER_ID = rev.id;
  assert.equal((await call({ ...ok, itemType: "X" })).status, 400);
  assert.equal((await call({ ...ok, vote: "APPROVE" })).status, 400);
  assert.equal((await call({ ...ok, rationale: " " })).status, 400);
  assert.equal((await call({ ...ok, itemId: "nope" })).status, 404);
  const res = await call(ok);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).result.confirmVotes, 1);
  process.env.PFPA_DEV_USER_ID = sub.id; // submitter voting on own claim
  assert.equal((await call(ok)).status, 403);
  console.log("ROUTE TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
