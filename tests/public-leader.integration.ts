import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { GET } from "../src/app/api/public/leaders/[id]/route";

const get = (id: string, qs = "") => GET(new Request(`http://x/api/public/leaders/${id}${qs}`), { params: Promise.resolve({ id }) });
const FORBIDDEN = ["submitterId", "uploaderId", "reviewNotes", "reviewedById", "tokenHash", "recipientEmail", "votes", "email", "handle", "replyStatus", "replyDeadline", "reviewStatus", "publishedWithItem", "avatarUrl"];
function keysOf(o: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(o)) o.forEach((x) => keysOf(x, out));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { out.add(k); keysOf(v, out); }
  return out;
}

async function main() {
  const tag = Date.now().toString();
  const sub = await prisma.user.create({ data: { email: `secret.${tag}@t.io`, handle: `h${tag}`, role: "CONTRIBUTOR" } });
  const leader = await prisma.leader.create({ data: { slug: `lp${tag}`, displayName: "Profile Leader", bio: "A bio", aliases: [], publicProfileUrls: [] } });
  const mk = (state: string, o: object = {}) => prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: `c-${Math.random()}`, dateMade: new Date(), sourceUrl: "https://a.example", state: state as "VERIFIED", ...o } });

  assert.equal((await get("missing")).status, 404);
  // empty profile: no score, nothing measurable yet
  let b = await (await get(leader.id)).json();
  assert.equal(b.stats.totalItems, 0);
  assert.equal(b.stats.rightOfReply.responseRate, null);
  assert.equal(b.score.band, "INSUFFICIENT_DATA");

  // 2 responded, 1 declined, 1 expired, 2 never asked, 1 still open, 1 disputed; plus non-public items
  for (const rs of ["RECEIVED", "RECEIVED", "DECLINED", "EXPIRED"]) await mk("VERIFIED", { replyStatus: rs, outcome: rs === "EXPIRED" ? "FAILED" : "FULFILLED" });
  await mk("VERIFIED"); await mk("VERIFIED");
  await mk("VERIFIED", { replyStatus: "OFFERED", replyDeadline: new Date(Date.now() + 86400_000) });
  await mk("DISPUTED");
  for (const s of ["IN_REVIEW", "DRAFT", "REJECTED", "WITHDRAWN"]) await mk(s);
  await prisma.incident.create({ data: { leaderId: leader.id, submitterId: sub.id, category: "SCANDAL_MORAL", dimension: "BEHAVIORAL", title: "Public incident", description: "d", occurredAt: new Date(), severity: 2, state: "VERIFIED", replyStatus: "RECEIVED" } });
  await prisma.incident.create({ data: { leaderId: leader.id, submitterId: sub.id, category: "SCANDAL_MORAL", dimension: "BEHAVIORAL", title: "Hidden", description: "d", occurredAt: new Date(), severity: 2, state: "IN_REVIEW" } });

  // lookup by id AND by slug return the same profile
  b = await (await get(leader.id)).json();
  const bySlug = await (await get(leader.slug)).json();
  assert.equal(bySlug.leader.id, leader.id);
  assert.equal(b.leader.displayName, "Profile Leader");
  assert.equal(b.leader.bio, "A bio");

  // only public items, correct counts
  assert.equal(b.stats.totalClaims, 8);            // 7 verified + 1 disputed
  assert.equal(b.stats.totalIncidents, 1);
  assert.equal(b.stats.totalItems, 9);
  assert.equal(b.stats.disputedItems, 1);
  assert.equal(b.items.claims.length, 8);
  assert.ok(b.items.claims.every((c: { id: string }) => c.id));
  assert.equal(b.items.incidents.length, 1);
  assert.equal(b.stats.claimOutcomes.FULFILLED, 3);
  assert.equal(b.stats.claimOutcomes.FAILED, 1);

  // reply stats only count CLOSED windows; unasked / still-open items are neutral
  const r = b.stats.rightOfReply;
  assert.equal(r.responded, 3);       // 2 claims + 1 incident
  assert.equal(r.declined, 1);
  assert.equal(r.noResponse, 1);
  assert.equal(r.awaitingResponse, 1);
  assert.equal(r.closedWindows, 5);
  assert.equal(r.responseRate, 60);   // 3 / 5, NOT 3 / 9

  // pagination: totals stay global, lists are paged
  const p1 = await (await get(leader.id, "?limit=3&offset=0")).json();
  assert.equal(p1.items.claims.length, 3);
  assert.equal(p1.page.hasMoreClaims, true);
  assert.equal(p1.stats.totalClaims, 8);
  const p3 = await (await get(leader.id, "?limit=3&offset=6")).json();
  assert.equal(p3.items.claims.length, 2);
  assert.equal(p3.page.hasMoreClaims, false);
  assert.equal((await (await get(leader.id, "?limit=99999")).json()).page.limit, 100); // capped
  assert.equal((await (await get(leader.id, "?limit=abc")).json()).page.limit, 50);   // junk -> default

  // nothing internal anywhere
  const keys = keysOf(b);
  for (const k of FORBIDDEN) assert.ok(!keys.has(k), `forbidden key leaked: ${k}`);
  const text = JSON.stringify(b);
  for (const secret of [`secret.${tag}@t.io`, `h${tag}`, sub.id, "Hidden"]) assert.ok(!text.includes(secret), `leaked: ${secret}`);
  console.log("PUBLIC LEADER TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
