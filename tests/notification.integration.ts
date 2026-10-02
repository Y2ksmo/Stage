import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { setMailTransport, NotificationService } from "../src/services/notification";
import { POST as startWindow } from "../src/app/api/moderation/reply-window/route";

const post = (body: unknown) => startWindow(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));

async function main() {
  const tag = Date.now().toString();
  const editor = await prisma.user.create({ data: { email: `e${tag}@t.io`, handle: `e${tag}`, role: "EDITOR" } });
  const leader = await prisma.leader.create({ data: { slug: `n${tag}`, displayName: "Notice Leader", aliases: [], publicProfileUrls: [], replyContact: "press@org.example" } });
  const claim = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: editor.id, statementText: "A verbatim prophecy statement", dateMade: new Date(), sourceUrl: "https://a.example", state: "IN_REVIEW" } });
  process.env.PFPA_DEV_USER_ID = editor.id;
  process.env.APP_BASE_URL = "https://pfpa.example/";

  // delivery failure rolls the window back: nothing OFFERED, no orphan row, failure audited
  setMailTransport(async () => { throw new Error("smtp down"); });
  const res = await post({ itemType: "CLAIM", itemId: claim.id });
  assert.equal(res.status, 502);
  const after = await prisma.claim.findUniqueOrThrow({ where: { id: claim.id } });
  assert.equal(after.replyStatus, "NOT_OFFERED");
  assert.equal(after.replyDeadline, null);
  assert.equal(await prisma.rightOfReply.count({ where: { claimId: claim.id } }), 0);
  assert.equal(await prisma.moderationAction.count({ where: { targetId: claim.id, action: "RIGHT_OF_REPLY_NOTICE_FAILED" } }), 1);

  // retry succeeds; email content is right
  let sent: { to: string; subject: string; text: string; html?: string } | null = null;
  setMailTransport(async (m) => { sent = m; });
  assert.equal((await post({ itemType: "CLAIM", itemId: claim.id })).status, 200);
  const m = sent as unknown as { to: string; subject: string; text: string; html: string };
  assert.equal(m.to, "press@org.example");
  assert.match(m.text, /https:\/\/pfpa\.example\/reply\?token=[A-Za-z0-9_-]{40,}/);
  assert.match(m.text, /Uiterste reactiedatum: \d+ \w+ 20\d\d om \d+:\d\d \(UTC\)/);
  assert.match(m.subject, /^Verzoek tot wederhoor: Notice Leader/);
  assert.match(m.html, /<a href="https:\/\/pfpa\.example\/reply\?token=[A-Za-z0-9_-]{40,}"/);
  assert.match(m.text, /A verbatim prophecy statement/);
  assert.ok(!m.text.includes("//reply")); // trailing slash in base URL normalised

  // validation and production safety
  await assert.rejects(NotificationService.sendRightOfReplyNotice({ recipientEmail: "bad", leaderName: "x", itemTitle: "y", rawToken: "t", deadline: new Date() }), /recipient/);
  setMailTransport(null);
  const env = process.env as Record<string, string | undefined>;
  const saved = { n: env.NODE_ENV, k: env.RESEND_API_KEY };
  env.NODE_ENV = "production"; delete env.RESEND_API_KEY;
  await assert.rejects(NotificationService.sendRightOfReplyNotice({ recipientEmail: "a@b.co", leaderName: "x", itemTitle: "y", rawToken: "t", deadline: new Date() }), /not configured/);
  env.APP_BASE_URL = "http://insecure.example";
  env.RESEND_API_KEY = "k";
  await assert.rejects(NotificationService.sendRightOfReplyNotice({ recipientEmail: "a@b.co", leaderName: "x", itemTitle: "y", rawToken: "t", deadline: new Date() }), /https required/);
  env.NODE_ENV = saved.n; if (saved.k) env.RESEND_API_KEY = saved.k; else delete env.RESEND_API_KEY;
  console.log("NOTIFICATION TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
