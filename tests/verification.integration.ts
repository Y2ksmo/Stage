import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { VerificationService } from "../src/services/verification";

async function main() {
  const tag = Date.now().toString();
  const mkUser = (n: string, role: "CONTRIBUTOR" | "REVIEWER") =>
    prisma.user.create({ data: { email: `${n}${tag}@t.io`, handle: `${n}${tag}`, role } });
  const [sub, r1, r2] = await Promise.all([mkUser("sub", "CONTRIBUTOR"), mkUser("r1", "REVIEWER"), mkUser("r2", "REVIEWER")]);
  const leader = await prisma.leader.create({ data: { slug: `l${tag}`, displayName: "Test Leader", aliases: [], publicProfileUrls: [] } });
  const claim = await prisma.claim.create({
    data: { leaderId: leader.id, submitterId: sub.id, statementText: "It will happen by 2020", dateMade: new Date("2019-01-01"),
      targetDate: new Date("2020-01-01"), sourceUrl: "https://a.example/v", outcome: "FAILED", specificity: 0.8 },
  });
  const ev = (publisherKey: string, tier: "PRIMARY" | "TIER1_MEDIA", group?: string) => ({
    uploaderId: sub.id, claimId: claim.id, kind: "URL" as const, url: `https://${publisherKey}/x`, archiveUrl: `https://web.archive.org/${publisherKey}`,
    sha256: "ab".repeat(32), tier, publisherKey, ownershipGroup: group ?? null,
  });

  await assert.rejects(VerificationService.submitForReview("CLAIM", claim.id), /evidence/);
  await prisma.evidence.create({ data: ev("a.example", "PRIMARY", "grpA") });
  await VerificationService.submitForReview("CLAIM", claim.id);

  await assert.rejects(VerificationService.castVote({ reviewerId: sub.id, targetType: "CLAIM", targetId: claim.id, value: "CONFIRM", rationale: "x" }), /Unauthorized/);
  let res = await VerificationService.castVote({ reviewerId: r1.id, targetType: "CLAIM", targetId: claim.id, value: "CONFIRM", rationale: "ok" });
  assert.equal(res.state, "IN_REVIEW");
  // same reviewer re-voting must not double count
  res = await VerificationService.castVote({ reviewerId: r1.id, targetType: "CLAIM", targetId: claim.id, value: "CONFIRM", rationale: "again" });
  assert.equal(res.confirmVotes, 1);
  // second source from the SAME ownership group does not count as independent
  await prisma.evidence.create({ data: ev("syndicate.example", "TIER1_MEDIA", "grpA") });
  res = await VerificationService.castVote({ reviewerId: r2.id, targetType: "CLAIM", targetId: claim.id, value: "CONFIRM", rationale: "ok" });
  assert.equal(res.state, "IN_REVIEW");
  assert.equal(res.independentSourceCount, 1);
  // genuinely independent source -> verified
  await prisma.evidence.create({ data: ev("reuters.example", "TIER1_MEDIA") });
  res = await VerificationService.evaluateAndSetState("CLAIM", claim.id);
  assert.equal(res.state, "VERIFIED");
  assert.equal((await prisma.claim.findUniqueOrThrow({ where: { id: claim.id } })).state, "VERIFIED");
  // DB constraint: vote must have exactly one target
  await assert.rejects(prisma.verificationVote.create({ data: { reviewerId: r1.id, value: "CONFIRM", rationale: "x" } }));
  console.log("ALL VERIFICATION TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
