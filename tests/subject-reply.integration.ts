import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { POST as startWindow } from "../src/app/api/moderation/reply-window/route";
import { POST as reply } from "../src/app/api/reply/route";

const post = (h: typeof reply, body: unknown) => h(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));

async function main() {
  const tag = Date.now().toString();
  const mk = (n: string, role: "EDITOR" | "REVIEWER" | "CONTRIBUTOR") => prisma.user.create({ data: { email: `${n}${tag}@t.io`, handle: `${n}${tag}`, role } });
  const [editor, r1, r2, sub] = await Promise.all([mk("e", "EDITOR"), mk("a", "REVIEWER"), mk("b", "REVIEWER"), mk("s", "CONTRIBUTOR")]);
  const leader = await prisma.leader.create({ data: { slug: `p${tag}`, displayName: "P", aliases: [], publicProfileUrls: [], replyContact: "press@org.example" } });
  process.env.PFPA_DEV_USER_ID = editor.id;

  const mkClaim = () => prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: "q", dateMade: new Date(), sourceUrl: "https://a.example", state: "IN_REVIEW" } });
  const open = async (claimId: string) => {
    const res = await post(startWindow, { itemType: "CLAIM", itemId: claimId });
    assert.equal(res.status, 200);
    return (await res.json()).result.replyToken as string;
  };

  // --- ACCEPT with text ---
  const c1 = await mkClaim();
  const t1 = await open(c1.id);
  const stored = await prisma.rightOfReply.findFirstOrThrow({ where: { claimId: c1.id } });
  assert.ok(stored.tokenHash && stored.tokenHash !== t1); // plaintext token never stored

  assert.equal((await post(reply, { token: "x".repeat(43), action: "ACCEPT", replyText: "hi" })).status, 404); // wrong token
  assert.equal((await post(reply, { token: t1, action: "ACCEPT" })).status, 400); // needs text
  assert.equal((await post(reply, { token: t1, action: "ACCEPT", replyText: "x", evidenceUrls: ["javascript:1"] })).status, 400);
  assert.equal((await post(reply, { token: t1, action: "MAYBE" })).status, 400);

  const ok = await post(reply, { token: t1, action: "ACCEPT", replyText: "This was taken out of context.", evidenceUrls: ["https://proof.example/x"] });
  assert.equal(ok.status, 200);
  assert.equal((await prisma.claim.findUniqueOrThrow({ where: { id: c1.id } })).replyStatus, "RECEIVED");
  const row = await prisma.rightOfReply.findUniqueOrThrow({ where: { id: stored.id } });
  assert.equal(row.responseText, "This was taken out of context.");
  assert.ok(row.respondedAt);
  assert.deepEqual(row.evidenceUrls, ["https://proof.example/x"]);
  assert.equal((await post(reply, { token: t1, action: "DECLINE" })).status, 409); // token is single-use

  // --- DECLINE, no text needed ---
  const c2 = await mkClaim();
  const t2 = await open(c2.id);
  assert.equal((await post(reply, { token: t2, action: "DECLINE" })).status, 200);
  assert.equal((await prisma.claim.findUniqueOrThrow({ where: { id: c2.id } })).replyStatus, "DECLINED");

  // --- after the deadline the subject can no longer reply ---
  const c3 = await mkClaim();
  const t3 = await open(c3.id);
  await prisma.claim.update({ where: { id: c3.id }, data: { replyDeadline: new Date(Date.now() - 1000) } });
  assert.equal((await post(reply, { token: t3, action: "ACCEPT", replyText: "late" })).status, 409);
  assert.equal((await prisma.claim.findUniqueOrThrow({ where: { id: c3.id } })).replyStatus, "OFFERED"); // untouched

  // --- answering can complete verification (incident: reply is a hard requirement) ---
  const inc = await prisma.incident.create({ data: { leaderId: leader.id, submitterId: sub.id, category: "SCANDAL_MORAL", dimension: "BEHAVIORAL", title: "t", description: "d", occurredAt: new Date(), severity: 3, state: "IN_REVIEW" } });
  for (const k of ["a.example", "b.example"]) await prisma.evidence.create({ data: { uploaderId: sub.id, incidentId: inc.id, kind: "URL", url: `https://${k}`, archiveUrl: `https://arc/${k}`, sha256: "ab".repeat(32), tier: "TIER1_MEDIA", publisherKey: k } });
  for (const r of [r1, r2]) await prisma.verificationVote.create({ data: { reviewerId: r.id, incidentId: inc.id, value: "CONFIRM", rationale: "ok" } });
  const w = await post(startWindow, { itemType: "INCIDENT", itemId: inc.id });
  const ti = (await w.json()).result.replyToken as string;
  assert.equal((await prisma.incident.findUniqueOrThrow({ where: { id: inc.id } })).state, "IN_REVIEW"); // window open: blocked
  const done = await post(reply, { token: ti, action: "ACCEPT", replyText: "We dispute severity." });
  assert.equal((await done.json()).result.itemState, "VERIFIED");
  console.log("SUBJECT REPLY TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
