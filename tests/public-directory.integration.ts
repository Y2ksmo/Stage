import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { getRecentLeaders, getRecentPublicItems, searchPublic } from "../src/services/publicDirectory";

async function main() {
  const tag = `zq${Date.now().toString(36)}`; // unique, letters+digits: safe to search for literally
  const sub = await prisma.user.create({ data: { email: `${tag}@t.io`, handle: tag, role: "CONTRIBUTOR" } });
  const mkLeader = (slug: string, displayName: string, extra: object = {}) => prisma.leader.create({ data: { slug: `${tag}-${slug}`, displayName, aliases: [], publicProfileUrls: [], ...extra } });
  const mkClaim = (leaderId: string, text: string, state: string) => prisma.claim.create({ data: { leaderId, submitterId: sub.id, statementText: text, dateMade: new Date(), sourceUrl: "https://a.example", state: state as "VERIFIED" } });

  const withItems = await mkLeader("a", `${tag} Alpha`, { tradition: "Evangelisch", country: "NL", aliases: [`${tag}-bijnaam`] });
  const onlyDisputed = await mkLeader("d", `${tag} Delta`);
  const nothingPublic = await mkLeader("n", `${tag} Nobody`);
  await mkClaim(withItems.id, `${tag} verified prophecy 100% sure`, "VERIFIED");
  await mkClaim(withItems.id, `${tag} verified prophecy 100x sure`, "VERIFIED");
  await mkClaim(withItems.id, `${tag} snake_case claim`, "VERIFIED");
  await mkClaim(withItems.id, `${tag} snakeXcase claim`, "VERIFIED");
  await mkClaim(withItems.id, `${tag} still in review`, "IN_REVIEW");
  await mkClaim(withItems.id, `${tag} a draft`, "DRAFT");
  await mkClaim(withItems.id, `${tag} rejected one`, "REJECTED");
  await mkClaim(withItems.id, `${tag} withdrawn one`, "WITHDRAWN");
  await mkClaim(onlyDisputed.id, `${tag} contested statement`, "DISPUTED");
  await mkClaim(nothingPublic.id, `${tag} hidden draft only`, "DRAFT");
  await prisma.incident.create({ data: { leaderId: withItems.id, submitterId: sub.id, category: "SCANDAL_MORAL", dimension: "BEHAVIORAL", title: `${tag} public incident`, description: `details about ${tag}-needle`, occurredAt: new Date(), severity: 2, state: "VERIFIED" } });

  // too short / empty
  assert.equal((await searchPublic("a")).tooShort, true);
  assert.equal((await searchPublic("   ")).tooShort, true);

  // leaders: listed only if something public stands behind them
  const byTag = await searchPublic(tag);
  const names = byTag.leaders.map((l) => l.displayName);
  assert.ok(names.includes(`${tag} Alpha`) && names.includes(`${tag} Delta`)); // disputed counts as public
  assert.ok(!names.includes(`${tag} Nobody`), "a leader with no public items is never listed");
  assert.equal(byTag.leaders.find((l) => l.displayName === `${tag} Alpha`)!.publicItems, 5); // 4 claims + 1 incident
  // matching is case-insensitive, and aliases match exactly
  assert.ok((await searchPublic(tag.toUpperCase() + " alpha")).leaders.some((l) => l.displayName.endsWith("Alpha")));
  assert.ok((await searchPublic(`${tag}-bijnaam`)).leaders.some((l) => l.displayName.endsWith("Alpha")));

  // items: only public states, disputed flagged
  const claimTitles = byTag.claims.map((c) => c.title);
  for (const hidden of ["still in review", "a draft", "rejected one", "withdrawn one", "hidden draft only"]) assert.ok(!claimTitles.some((t) => t.includes(hidden)), `${hidden} must not be searchable`);
  const contested = byTag.claims.find((c) => c.title.includes("contested"))!;
  assert.equal(contested.disputed, true);
  assert.equal(byTag.claims.find((c) => c.title.includes("verified prophecy 100%"))!.disputed, false);
  assert.equal(byTag.incidents.length, 1);
  assert.equal((await searchPublic(`${tag}-needle`)).incidents.length, 1); // matches description too

  // LIKE wildcards are literal
  const pct = (await searchPublic(`${tag} verified prophecy 100%`)).claims;
  assert.equal(pct.length, 1);
  assert.ok(pct[0].title.includes("100%"));
  const us = (await searchPublic(`${tag} snake_case`)).claims;
  assert.equal(us.length, 1);
  assert.ok(us[0].title.includes("snake_case"));
  assert.equal((await searchPublic("%%")).claims.length, 0);
  assert.equal((await searchPublic("__")).leaders.length + (await searchPublic("__")).claims.length, 0);

  // payload has no internal data
  const text = JSON.stringify(byTag);
  for (const secret of [sub.id, `${tag}@t.io`, "submitter", "tokenHash"]) assert.ok(!text.includes(secret), `leaked ${secret}`);

  // home lists: recency of VERIFIED activity; disputed-only leaders and disputed items are not promoted
  const recentLeaders = await getRecentLeaders(50);
  assert.ok(recentLeaders.some((l) => l.id === withItems.id));
  assert.ok(!recentLeaders.some((l) => l.id === onlyDisputed.id), "disputed-only leader is not promoted");
  assert.ok(!recentLeaders.some((l) => l.id === nothingPublic.id));
  const recentItems = await getRecentPublicItems(500);
  assert.ok(recentItems.some((i) => i.title.includes("public incident")));
  assert.ok(!recentItems.some((i) => i.title.includes("contested")), "disputed items are not promoted");
  assert.ok(!recentItems.some((i) => i.title.includes("still in review")));
  const sorted = [...recentItems].sort((a, b) => b.at.getTime() - a.at.getTime());
  assert.deepEqual(recentItems.map((i) => i.id), sorted.map((i) => i.id)); // newest first
  console.log("PUBLIC DIRECTORY TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
