import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { setMailTransport } from "../src/services/notification";
import { POST as startWindow } from "../src/app/api/moderation/reply-window/route";
import { POST as submitReply } from "../src/app/api/reply/route";
import { GET as listPending, POST as review } from "../src/app/api/moderation/reply-review/route";

const env = process.env as Record<string, string | undefined>;
const post = (h: (r: Request) => Promise<Response>, body: unknown) => h(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));

async function main() {
  const tag = Date.now().toString();
  const mk = (n: string, role: "EDITOR" | "REVIEWER" | "CONTRIBUTOR") => prisma.user.create({ data: { email: `${n}${tag}@t.io`, handle: `${n}${tag}`, role } });
  const [editor, rev, sub] = await Promise.all([mk("e", "EDITOR"), mk("r", "REVIEWER"), mk("s", "CONTRIBUTOR")]);
  const leader = await prisma.leader.create({ data: { slug: `rr${tag}`, displayName: "RR", aliases: [], publicProfileUrls: [], replyContact: "press@org.example" } });
  env.APP_BASE_URL = "https://pfpa.example";
  let mail = "";
  setMailTransport(async (m) => { mail = m.text; });
  env.PFPA_DEV_USER_ID = editor.id;

  const reply = async (action: "ACCEPT" | "DECLINE", text?: string) => {
    const c = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: "q", dateMade: new Date(), sourceUrl: "https://a.example", state: "IN_REVIEW" } });
    assert.equal((await post(startWindow, { itemType: "CLAIM", itemId: c.id })).status, 200);
    const token = mail.match(/token=([A-Za-z0-9_-]+)/)![1];
    assert.equal((await post(submitReply, { token, action, replyText: text })).status, 200);
    return prisma.rightOfReply.findFirstOrThrow({ where: { claimId: c.id } });
  };

  // a submitted reply starts unpublished and pending; a decline has nothing to review
  const r1 = await reply("ACCEPT", "We dispute this.");
  assert.equal(r1.reviewStatus, "PENDING");
  assert.equal(r1.publishedWithItem, false);
  const declined = await reply("DECLINE");
  assert.equal(declined.reviewStatus, null);
  assert.equal(declined.publishedWithItem, false);

  // authorization on both endpoints
  env.PFPA_DEV_USER_ID = rev.id;
  assert.equal((await listPending(new Request("http://x"))).status, 403);
  assert.equal((await post(review, { replyId: r1.id, decision: "APPROVED" })).status, 403);
  delete env.PFPA_DEV_USER_ID;
  assert.equal((await listPending(new Request("http://x"))).status, 401);
  env.PFPA_DEV_USER_ID = editor.id;

  // queue shows the pending reply with context
  const queue = (await (await listPending(new Request("http://x"))).json()).replies as Array<{ replyId: string; leaderName: string }>;
  assert.ok(queue.some((q) => q.replyId === r1.id && q.leaderName === "RR"));
  assert.ok(!queue.some((q) => q.replyId === declined.id));

  // validation
  assert.equal((await post(review, { replyId: r1.id, decision: "NEEDS_REVISION" })).status, 400);
  assert.equal((await post(review, { replyId: r1.id, decision: "REJECTED" })).status, 400); // reason required
  assert.equal((await post(review, { replyId: "nope", decision: "APPROVED" })).status, 404);
  assert.equal((await post(review, { replyId: declined.id, decision: "APPROVED" })).status, 409); // nothing to review

  // approve -> public + audited; same decision again conflicts
  assert.equal((await post(review, { replyId: r1.id, decision: "APPROVED", notes: "Fine" })).status, 200);
  const approved = await prisma.rightOfReply.findUniqueOrThrow({ where: { id: r1.id } });
  assert.equal(approved.reviewStatus, "APPROVED");
  assert.equal(approved.publishedWithItem, true);
  assert.equal(approved.reviewedById, editor.id);
  assert.equal((await post(review, { replyId: r1.id, decision: "APPROVED" })).status, 409);
  assert.equal(await prisma.moderationAction.count({ where: { actorId: editor.id, action: "RIGHT_OF_REPLY_REVIEW_APPROVED" } }), 1);

  // later revision: approved reply found problematic -> withdrawn from publication, reason kept
  assert.equal((await post(review, { replyId: r1.id, decision: "REJECTED", notes: "Names a private third party" })).status, 200);
  const rejected = await prisma.rightOfReply.findUniqueOrThrow({ where: { id: r1.id } });
  assert.equal(rejected.reviewStatus, "REJECTED");
  assert.equal(rejected.publishedWithItem, false);
  assert.equal(rejected.reviewNotes, "Names a private third party");
  assert.ok(rejected.responseText); // text retained for the record
  console.log("REPLY REVIEW TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
