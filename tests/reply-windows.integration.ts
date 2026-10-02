import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { processExpiredReplyWindows } from "../src/services/replyWindows";
import { GET } from "../src/app/api/cron/reply-windows/route";

async function main() {
  const tag = Date.now().toString();
  const mk = (n: string, role: "CONTRIBUTOR" | "REVIEWER") => prisma.user.create({ data: { email: `${n}${tag}@t.io`, handle: `${n}${tag}`, role } });
  const [sub, r1, r2] = await Promise.all([mk("s", "CONTRIBUTOR"), mk("a", "REVIEWER"), mk("b", "REVIEWER")]);
  const leader = await prisma.leader.create({ data: { slug: `w${tag}`, displayName: "W", aliases: [], publicProfileUrls: [] } });
  const past = new Date(Date.now() - 3600_000), future = new Date(Date.now() + 86400_000);

  const proof = async (key: "claimId" | "incidentId", id: string) => {
    for (const k of ["a.example", "b.example"]) {
      await prisma.evidence.create({ data: { uploaderId: sub.id, [key]: id, kind: "URL", url: `https://${k}`, archiveUrl: `https://arc/${k}`, sha256: "ab".repeat(32), tier: "TIER1_MEDIA", publisherKey: k } });
    }
    for (const r of [r1, r2]) await prisma.verificationVote.create({ data: { reviewerId: r.id, [key]: id, value: "CONFIRM", rationale: "ok" } });
  };
  const mkClaim = async (deadline: Date) => {
    const c = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: "q", dateMade: new Date(), sourceUrl: "https://a.example", state: "IN_REVIEW", replyStatus: "OFFERED", replyDeadline: deadline } });
    await proof("claimId", c.id);
    return c;
  };
  const expiredClaim = await mkClaim(past);
  const openClaim = await mkClaim(future);
  const inc = await prisma.incident.create({ data: { leaderId: leader.id, submitterId: sub.id, category: "SCANDAL_MORAL", dimension: "BEHAVIORAL", title: "t", description: "d", occurredAt: new Date(), severity: 3, state: "IN_REVIEW", replyStatus: "OFFERED", replyDeadline: past } });
  await proof("incidentId", inc.id);

  // cron endpoint fails closed / checks the secret
  delete process.env.CRON_SECRET;
  assert.equal((await GET(new Request("http://x"))).status, 401);
  process.env.CRON_SECRET = "s3cret";
  assert.equal((await GET(new Request("http://x", { headers: { authorization: "Bearer wrong" } }))).status, 401);
  const res = await GET(new Request("http://x", { headers: { authorization: "Bearer s3cret" } }));
  assert.equal(res.status, 200);

  const claimAfter = await prisma.claim.findUniqueOrThrow({ where: { id: expiredClaim.id } });
  assert.equal(claimAfter.replyStatus, "EXPIRED");
  assert.equal(claimAfter.state, "VERIFIED"); // expiry was the last missing requirement
  const incAfter = await prisma.incident.findUniqueOrThrow({ where: { id: inc.id } });
  assert.equal(incAfter.replyStatus, "EXPIRED");
  assert.equal(incAfter.state, "VERIFIED");
  const openAfter = await prisma.claim.findUniqueOrThrow({ where: { id: openClaim.id } });
  assert.equal(openAfter.replyStatus, "OFFERED"); // window still open: untouched
  assert.equal(openAfter.state, "IN_REVIEW");

  // idempotent; and the rescoring hook fired
  const again = await processExpiredReplyWindows();
  assert.equal(again.errors.length, 0);
  assert.ok((await prisma.scoreSnapshot.count({ where: { leaderId: leader.id } })) >= 1);
  console.log("REPLY WINDOW TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
