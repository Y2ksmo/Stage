import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { setMailTransport } from "../src/services/notification";
import { POST } from "../src/app/api/moderation/reply-window/route";

const call = (body: unknown) => POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));

async function main() {
  process.env.APP_BASE_URL = "https://pfpa.example";
  setMailTransport(async () => {});
  const tag = Date.now().toString();
  const mk = (n: string, role: "EDITOR" | "REVIEWER") => prisma.user.create({ data: { email: `${n}${tag}@t.io`, handle: `${n}${tag}`, role } });
  const [editor, rev] = await Promise.all([mk("e", "EDITOR"), mk("r", "REVIEWER")]);
  const bare = await prisma.leader.create({ data: { slug: `n${tag}`, displayName: "NoContact", aliases: [], publicProfileUrls: [] } });
  const withContact = await prisma.leader.create({ data: { slug: `c${tag}`, displayName: "Contact", aliases: [], publicProfileUrls: [], replyContact: "press@org.example" } });
  const claim = (leaderId: string, state: "IN_REVIEW" | "DRAFT" = "IN_REVIEW") =>
    prisma.claim.create({ data: { leaderId, submitterId: rev.id, statementText: "q", dateMade: new Date(), sourceUrl: "https://a.example", state } });

  const c1 = await claim(withContact.id);
  const ok = { itemType: "CLAIM", itemId: c1.id };

  delete process.env.PFPA_DEV_USER_ID;
  assert.equal((await call(ok)).status, 401);
  process.env.PFPA_DEV_USER_ID = rev.id;
  assert.equal((await call(ok)).status, 403); // reviewers cannot start reply windows
  process.env.PFPA_DEV_USER_ID = editor.id;

  assert.equal((await call({ ...ok, itemType: "X" })).status, 400);
  assert.equal((await call({ ...ok, itemId: "nope" })).status, 404);
  assert.equal((await call({ itemType: "CLAIM", itemId: (await claim(withContact.id, "DRAFT")).id })).status, 409); // not in review
  assert.equal((await call({ itemType: "CLAIM", itemId: (await claim(bare.id)).id })).status, 400); // nobody to notify
  assert.equal((await call({ itemType: "CLAIM", itemId: (await claim(bare.id)).id, recipientEmail: "bad" })).status, 400);

  const res = await call(ok); // falls back to leader.replyContact
  assert.equal(res.status, 200);
  const out = (await res.json()).result;
  const days = (new Date(out.replyDeadline).getTime() - Date.now()) / 86400_000;
  assert.ok(days > 13.9 && days <= 14);
  const row = await prisma.claim.findUniqueOrThrow({ where: { id: c1.id } });
  assert.equal(row.replyStatus, "OFFERED");
  assert.equal(await prisma.rightOfReply.count({ where: { claimId: c1.id } }), 1);
  assert.equal(await prisma.moderationAction.count({ where: { targetId: c1.id, action: "RIGHT_OF_REPLY_OFFERED" } }), 1);
  assert.equal((await call(ok)).status, 409); // already offered

  // explicit recipient works for a leader without a stored contact; incidents too
  const c2 = await claim(bare.id);
  assert.equal((await call({ itemType: "CLAIM", itemId: c2.id, recipientEmail: "lawyer@x.example" })).status, 200);
  const inc = await prisma.incident.create({ data: { leaderId: withContact.id, submitterId: rev.id, category: "SCANDAL_MORAL", dimension: "BEHAVIORAL", title: "t", description: "d", occurredAt: new Date(), severity: 2, state: "IN_REVIEW" } });
  assert.equal((await call({ itemType: "INCIDENT", itemId: inc.id })).status, 200);
  console.log("RIGHT OF REPLY TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
