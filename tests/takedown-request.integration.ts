import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { POST } from "../src/app/api/takedown-requests/route";

const call = (body: unknown) => POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));

async function main() {
  const tag = Date.now().toString();
  const sub = await prisma.user.create({ data: { email: `s${tag}@t.io`, handle: `s${tag}`, role: "CONTRIBUTOR" } });
  const leader = await prisma.leader.create({ data: { slug: `q${tag}`, displayName: "Q", aliases: [], publicProfileUrls: [] } });
  const claim = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: "q", dateMade: new Date(), sourceUrl: "https://a.example", state: "VERIFIED" } });
  const ok = { requesterEmail: `Rep${tag}@Org.example`, targetType: "CLAIM", targetId: claim.id, grounds: "Quote taken out of context" };

  assert.equal((await call({ ...ok, requesterEmail: "nope" })).status, 400);
  assert.equal((await call({ ...ok, grounds: "  " })).status, 400);
  assert.equal((await call({ ...ok, targetType: "REVIEW" })).status, 400);
  assert.equal((await call({ ...ok, evidenceUrls: ["javascript:alert(1)"] })).status, 400);
  assert.equal((await call({ ...ok, targetId: "nope" })).status, 404);

  const res = await call({ ...ok, evidenceUrls: ["https://proof.example/doc"], requesterName: "A. Rep" });
  assert.equal(res.status, 201);
  const row = await prisma.takedown.findFirstOrThrow({ where: { targetId: claim.id } });
  assert.equal(row.status, "OPEN");
  assert.equal(row.leaderId, leader.id);
  assert.equal(row.requesterEmail, ok.requesterEmail.toLowerCase());
  assert.equal(row.requesterName, "A. Rep");
  // submitting must NOT hide the content
  assert.equal((await prisma.claim.findUniqueOrThrow({ where: { id: claim.id } })).state, "VERIFIED");
  assert.equal((await call(ok)).status, 409); // duplicate open request

  // leader-level request maps to PROFILE; per-email daily cap
  const lres = await call({ ...ok, targetType: "LEADER", targetId: leader.id });
  assert.equal(lres.status, 201);
  assert.equal((await prisma.takedown.findFirstOrThrow({ where: { targetId: leader.id } })).targetType, "PROFILE");
  for (let n = 0; n < 3; n++) {
    const c = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: `c${n}`, dateMade: new Date(), sourceUrl: "https://a.example" } });
    assert.equal((await call({ ...ok, targetId: c.id })).status, 201);
  }
  const extra = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: "x", dateMade: new Date(), sourceUrl: "https://a.example" } });
  assert.equal((await call({ ...ok, targetId: extra.id })).status, 429);
  console.log("TAKEDOWN REQUEST TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
