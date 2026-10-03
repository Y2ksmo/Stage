import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { listTakedownRequests } from "../src/services/takedownQueue";

async function main() {
  const tag = Date.now().toString();
  const mk = (n: string, role: "LEGAL" | "REVIEWER" | "EDITOR" | "ADMIN") => prisma.user.create({ data: { email: `${n}${tag}@t.io`, handle: `${n}${tag}`, role } });
  const [legal, rev, editor, admin] = await Promise.all([mk("l", "LEGAL"), mk("r", "REVIEWER"), mk("e", "EDITOR"), mk("a", "ADMIN")]);
  const leader = await prisma.leader.create({ data: { slug: `tq${tag}`, displayName: "TQ Leader", aliases: [], publicProfileUrls: [] } });
  const claim = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: rev.id, statementText: "TQ claim text", dateMade: new Date(), sourceUrl: "https://a.example", state: "VERIFIED" } });
  const mkReq = (targetType: string, targetId: string, status: "OPEN" | "UNDER_REVIEW" | "UPHELD" | "REJECTED") =>
    prisma.takedown.create({ data: { leaderId: leader.id, targetType, targetId, grounds: `g-${targetType}-${status}`, requesterEmail: "who@org.example", requesterName: "Who", evidenceUrls: ["https://p.example"], status } });
  const open = await mkReq("CLAIM", claim.id, "OPEN");
  const profile = await mkReq("PROFILE", leader.id, "OPEN");
  const gone = await mkReq("CLAIM", "does-not-exist", "OPEN");
  await mkReq("CLAIM", claim.id, "UPHELD");
  await mkReq("CLAIM", claim.id, "REJECTED");

  // only LEGAL / ADMIN may see requester data
  for (const u of [rev, editor]) await assert.rejects(listTakedownRequests(u.id), /Legal- of admin-rol/);
  await assert.rejects(listTakedownRequests("nope"), /geschorst of onbekend/);
  await listTakedownRequests(admin.id);

  const q = (await listTakedownRequests(legal.id, 5000)).filter((r) => [open.id, profile.id, gone.id].includes(r.requestId));
  assert.equal(q.length, 3); // closed requests are not listed
  const o = q.find((r) => r.requestId === open.id)!;
  assert.equal(o.itemTitle, "TQ claim text");
  assert.equal(o.itemState, "VERIFIED");
  assert.equal(o.leaderName, "TQ Leader");
  assert.equal(o.requesterEmail, "who@org.example");
  assert.equal(o.actionable, true);
  assert.equal(q.find((r) => r.requestId === profile.id)!.actionable, false); // profile requests can't be executed yet
  assert.equal(q.find((r) => r.requestId === gone.id)!.actionable, false); // dangling target
  console.log("TAKEDOWN QUEUE TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
