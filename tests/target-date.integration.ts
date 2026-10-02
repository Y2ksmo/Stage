import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { VerificationService } from "../src/services/verification";
import { listVerificationQueue } from "../src/services/verificationQueue";

async function main() {
  const tag = Date.now().toString();
  const mk = (n: string, role: "REVIEWER" | "CONTRIBUTOR") => prisma.user.create({ data: { email: `${n}${tag}@t.io`, handle: `${n}${tag}`, role } });
  const [r1, r2, sub] = await Promise.all([mk("a", "REVIEWER"), mk("b", "REVIEWER"), mk("s", "CONTRIBUTOR")]);
  const leader = await prisma.leader.create({ data: { slug: `td${tag}`, displayName: "TD", aliases: [], publicProfileUrls: [] } });
  const day = 86400_000;

  // a claim with everything else in order: 2 archived independent sources, high specificity
  const mkClaim = async (outcome: "FAILED" | "FULFILLED", targetDate: Date | null) => {
    const c = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: `claim-${Math.random()}`, dateMade: new Date("2020-01-01"), targetDate, sourceUrl: "https://a.example", state: "IN_REVIEW", outcome, specificity: 0.9 } });
    for (const k of ["nos.example", "rtl.example"]) await prisma.evidence.create({ data: { uploaderId: sub.id, claimId: c.id, kind: "URL", url: `https://${k}`, archiveUrl: `https://arc/${k}`, sha256: "ab".repeat(32), tier: "TIER1_MEDIA", publisherKey: k } });
    return c;
  };
  const vote = (claimId: string, reviewerId: string) => VerificationService.castVote({ reviewerId, targetType: "CLAIM", targetId: claimId, value: "CONFIRM", rationale: "ok" });
  const stateOf = async (id: string) => (await prisma.claim.findUniqueOrThrow({ where: { id } })).state;

  // FAILED + target date in the future: two confirmations are NOT enough
  const future = await mkClaim("FAILED", new Date(Date.now() + 30 * day));
  await vote(future.id, r1.id);
  const res = await vote(future.id, r2.id);
  assert.equal(res.state, "IN_REVIEW");
  assert.equal(await stateOf(future.id), "IN_REVIEW");
  assert.match(res.reason, /target date \(\d{4}-\d{2}-\d{2}\) to have passed/);
  assert.deepEqual(res.missing.map((m) => m.code), ["TARGET_DATE"]);
  // the reviewer queue explains it in Dutch
  const q = (await listVerificationQueue(sub.id === r1.id ? r1.id : (await mk("q", "REVIEWER")).id, 5000)).find((i) => i.itemId === future.id)!;
  assert.match(q.progress, /Nog nodig: afloop van de streefdatum \(/);

  // once the date has passed, re-evaluation verifies it
  await prisma.claim.update({ where: { id: future.id }, data: { targetDate: new Date(Date.now() - 2 * day) } });
  assert.equal((await VerificationService.evaluateAndSetState("CLAIM", future.id)).state, "VERIFIED");

  // FAILED without any target date can never verify
  const undated = await mkClaim("FAILED", null);
  await vote(undated.id, r1.id);
  const u = await vote(undated.id, r2.id);
  assert.equal(u.state, "IN_REVIEW");
  assert.deepEqual(u.missing.map((m) => m.code), ["TARGET_DATE"]);
  assert.match(u.reason, /a target date on the prediction/);

  // today's date is not enough: the day must have ended
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const sameDay = await mkClaim("FAILED", today);
  await vote(sameDay.id, r1.id);
  assert.equal((await vote(sameDay.id, r2.id)).state, "IN_REVIEW");

  // other outcomes are unaffected by a future target date
  const fulfilled = await mkClaim("FULFILLED", new Date(Date.now() + 30 * day));
  await vote(fulfilled.id, r1.id);
  assert.equal((await vote(fulfilled.id, r2.id)).state, "VERIFIED");
  console.log("TARGET DATE TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
