import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { listVerificationQueue } from "../src/services/verificationQueue";
import { VerificationService } from "../src/services/verification";

async function main() {
  const tag = Date.now().toString();
  const mk = (n: string, role: "REVIEWER" | "CONTRIBUTOR" | "EDITOR") => prisma.user.create({ data: { email: `${n}${tag}@t.io`, handle: `${n}${tag}`, role } });
  const [r1, r2, sub, contrib] = await Promise.all([mk("a", "REVIEWER"), mk("b", "REVIEWER"), mk("s", "CONTRIBUTOR"), mk("c", "CONTRIBUTOR")]);
  const leader = await prisma.leader.create({ data: { slug: `q${tag}`, displayName: "Queue Leader", aliases: [], publicProfileUrls: [] } });
  const claim = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: "Queue claim", dateMade: new Date("2000-01-01"), sourceUrl: "https://a.example", state: "IN_REVIEW", outcome: "FAILED", specificity: 0.8 } });
  const own = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: r1.id, statementText: "Reviewer's own claim", dateMade: new Date("2000-01-02"), sourceUrl: "https://a.example", state: "IN_REVIEW" } });
  await prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: "Draft not queued", dateMade: new Date(), sourceUrl: "https://a.example", state: "DRAFT" } });
  const inc = await prisma.incident.create({ data: { leaderId: leader.id, submitterId: sub.id, category: "SCANDAL_MORAL", dimension: "BEHAVIORAL", title: "Queue incident", description: "d", occurredAt: new Date("2000-01-03"), severity: 2, state: "IN_REVIEW" } });
  await prisma.evidence.create({ data: { uploaderId: sub.id, claimId: claim.id, kind: "URL", url: "https://news.example/a", archiveUrl: "https://arc/a", sha256: "ab".repeat(32), tier: "TIER1_MEDIA", publisherKey: "news.example" } });
  await prisma.evidence.create({ data: { uploaderId: sub.id, claimId: claim.id, kind: "URL", url: "https://blog.example/b", tier: "SECONDARY", publisherKey: "blog.example" } }); // not archived: must not count

  // authorization
  await assert.rejects(listVerificationQueue(contrib.id), /Reviewer-rol/);
  await assert.rejects(listVerificationQueue("nope"), /geschorst of onbekend/);

  // queue content: in-review only, own submissions excluded, longest-waiting first
  const q1 = (await listVerificationQueue(r1.id, 5000)).filter((i) => [claim.id, own.id, inc.id].includes(i.itemId));
  assert.deepEqual(q1.map((i) => i.itemId), [claim.id, inc.id]); // own claim excluded, draft absent
  const c = q1[0];
  assert.equal(c.leaderName, "Queue Leader");
  assert.equal(c.independentSources, 1); // unarchived blog does not count
  assert.equal(c.evidence.length, 2);
  assert.equal(c.evidence.find((e) => e.publisherKey === "blog.example")!.archived, false);
  assert.match(c.progress, /independent archived source/);
  assert.equal(c.myVote, null);
  assert.match(q1[1].progress, /right-of-reply/); // incidents need reply done

  // votes show as counts and as my own vote only
  await VerificationService.castVote({ reviewerId: r2.id, targetType: "CLAIM", targetId: claim.id, value: "CONFIRM", rationale: "checked" });
  const q2 = (await listVerificationQueue(r1.id, 5000)).find((i) => i.itemId === claim.id)!;
  assert.equal(q2.confirmVotes, 1);
  assert.equal(q2.myVote, null); // r2's vote is not attributed to r1
  const mine = (await listVerificationQueue(r2.id, 5000)).find((i) => i.itemId === claim.id)!;
  assert.equal(mine.myVote, "CONFIRM");
  assert.ok(!JSON.stringify(q2).includes(r2.id) && !JSON.stringify(q2).includes(sub.id), "no user ids in queue payload");

  // verified items leave the queue
  await prisma.claim.update({ where: { id: claim.id }, data: { state: "VERIFIED" } });
  assert.ok(!(await listVerificationQueue(r1.id, 5000)).some((i) => i.itemId === claim.id));
  console.log("VERIFICATION QUEUE TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
