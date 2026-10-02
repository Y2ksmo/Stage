import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { POST as reject } from "../src/app/api/moderation/takedown/reject/route";
import { POST as restore } from "../src/app/api/moderation/takedown/restore/route";

const call = (h: typeof reject, body: unknown) => h(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));

async function main() {
  const tag = Date.now().toString();
  const mk = (n: string, role: "LEGAL" | "REVIEWER" | "CONTRIBUTOR") => prisma.user.create({ data: { email: `${n}${tag}@t.io`, handle: `${n}${tag}`, role } });
  const [legal, r1, r2, sub] = await Promise.all([mk("lg", "LEGAL"), mk("a", "REVIEWER"), mk("b", "REVIEWER"), mk("s", "CONTRIBUTOR")]);
  const leader = await prisma.leader.create({ data: { slug: `r${tag}`, displayName: "R", aliases: [], publicProfileUrls: [] } });
  const mkClaim = async (state: "DISPUTED", withProof: boolean) => {
    const c = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: "q", dateMade: new Date(), sourceUrl: "https://a.example", state } });
    if (withProof) {
      for (const k of ["a.example", "b.example"]) {
        await prisma.evidence.create({ data: { uploaderId: sub.id, claimId: c.id, kind: "URL", url: `https://${k}`, archiveUrl: `https://arc/${k}`, sha256: "ab".repeat(32), tier: "TIER1_MEDIA", publisherKey: k } });
      }
      for (const r of [r1, r2]) await prisma.verificationVote.create({ data: { reviewerId: r.id, claimId: c.id, value: "CONFIRM", rationale: "ok" } });
    }
    return c;
  };

  process.env.PFPA_DEV_USER_ID = sub.id;
  assert.equal((await call(restore, { itemType: "CLAIM", itemId: "x", reason: "r" })).status, 403);
  process.env.PFPA_DEV_USER_ID = legal.id;

  // reject: item untouched, request closed, can't be rejected twice
  const proven = await mkClaim("DISPUTED", true);
  const treq = await prisma.takedown.create({ data: { leaderId: leader.id, targetType: "CLAIM", targetId: proven.id, grounds: "g", requesterEmail: "x@y.z" } });
  assert.equal((await call(reject, { takedownRequestId: treq.id, reason: " " })).status, 400);
  assert.equal((await call(reject, { takedownRequestId: "nope", reason: "r" })).status, 404);
  assert.equal((await call(reject, { takedownRequestId: treq.id, reason: "no merit" })).status, 200);
  assert.equal((await prisma.takedown.findUniqueOrThrow({ where: { id: treq.id } })).status, "REJECTED");
  assert.equal((await prisma.claim.findUniqueOrThrow({ where: { id: proven.id } })).state, "DISPUTED");
  assert.equal((await call(reject, { takedownRequestId: treq.id, reason: "again" })).status, 409);

  // restore a fully proven item -> VERIFIED and rescored
  const before = await prisma.scoreSnapshot.count({ where: { leaderId: leader.id } });
  let res = await call(restore, { itemType: "CLAIM", itemId: proven.id, reason: "content upheld" });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).result.state, "VERIFIED");
  assert.equal(await prisma.scoreSnapshot.count({ where: { leaderId: leader.id } }), before + 1);
  assert.equal((await call(restore, { itemType: "CLAIM", itemId: proven.id, reason: "x" })).status, 409); // no longer disputed

  // restore an item that never had proof -> back to IN_REVIEW, NOT verified
  const unproven = await mkClaim("DISPUTED", false);
  res = await call(restore, { itemType: "CLAIM", itemId: unproven.id, reason: "content upheld" });
  assert.equal((await res.json()).result.state, "IN_REVIEW");
  assert.equal((await prisma.claim.findUniqueOrThrow({ where: { id: unproven.id } })).state, "IN_REVIEW");
  console.log("RESTORE/REJECT TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
