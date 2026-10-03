import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { GET as getClaim } from "../src/app/api/public/claims/[id]/route";
import { GET as getIncident } from "../src/app/api/public/incidents/[id]/route";

const claimGet = (id: string) => getClaim(new Request("http://x"), { params: Promise.resolve({ id }) });
const incGet = (id: string) => getIncident(new Request("http://x"), { params: Promise.resolve({ id }) });

// keys / values that must never appear anywhere in a public payload
const FORBIDDEN_KEYS = ["submitterId", "uploaderId", "reviewNotes", "reviewedById", "reviewedAt", "tokenHash", "recipientEmail", "requesterEmail", "votes", "email", "handle", "reviewStatus", "publishedWithItem", "replyStatus", "replyDeadline"];
function keysOf(o: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(o)) o.forEach((x) => keysOf(x, out));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { out.add(k); keysOf(v, out); }
  return out;
}

async function main() {
  const tag = Date.now().toString();
  const sub = await prisma.user.create({ data: { email: `secret.${tag}@t.io`, handle: `h${tag}`, role: "CONTRIBUTOR" } });
  const leader = await prisma.leader.create({ data: { slug: `pub${tag}`, displayName: "Public Leader", aliases: [], publicProfileUrls: [] } });
  const mkClaim = (state: "VERIFIED" | "DISPUTED" | "IN_REVIEW" | "DRAFT" | "REJECTED" | "WITHDRAWN", extra: object = {}) =>
    prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: "Verbatim prophecy", dateMade: new Date("2023-01-01"), sourceUrl: "https://a.example", state, ...extra } });
  const addEvidence = (claimId: string) => prisma.evidence.create({ data: { uploaderId: sub.id, claimId, kind: "URL", url: "https://news.example/a", archiveUrl: "https://arc/a", sha256: "ab".repeat(32), tier: "TIER1_MEDIA", publisherKey: "news.example" } });
  const addReply = (claimId: string, d: object) => prisma.rightOfReply.create({ data: { claimId, tokenHash: `h${Math.random()}`, recipientEmail: "private@org.example", respondedAt: new Date(), responseText: "Our reply text", evidenceUrls: ["https://proof.example"], ...d } });

  // only VERIFIED / DISPUTED are public; everything else is indistinguishable from "unknown"
  for (const s of ["IN_REVIEW", "DRAFT", "REJECTED", "WITHDRAWN"] as const) assert.equal((await claimGet((await mkClaim(s)).id)).status, 404, s);
  assert.equal((await claimGet("nope")).status, 404);

  const verified = await mkClaim("VERIFIED", { outcome: "FAILED", replyStatus: "NOT_OFFERED" });
  await addEvidence(verified.id);
  let body = await (await claimGet(verified.id)).json();
  assert.equal(body.item.disputed, false);
  assert.equal(body.item.leader.displayName, "Public Leader");
  assert.equal(body.item.evidence.length, 1);
  assert.equal(body.item.response.status, "NOT_OFFERED");
  assert.ok(body.disclaimer);

  const disputed = await mkClaim("DISPUTED");
  assert.equal((await (await claimGet(disputed.id)).json()).item.disputed, true);

  // every reply state maps to the right public view
  const check = async (replyStatus: string, reply: object | null, expected: string, deadline?: Date) => {
    const c = await mkClaim("VERIFIED", { replyStatus, replyDeadline: deadline ?? null });
    if (reply) await addReply(c.id, reply);
    const json = await (await claimGet(c.id)).json();
    assert.equal(json.item.response.status, expected, `${replyStatus}/${JSON.stringify(reply)}`);
    return json;
  };
  await check("OFFERED", null, "AWAITING_RESPONSE", new Date(Date.now() + 86400_000));
  await check("EXPIRED", null, "NO_RESPONSE");
  await check("DECLINED", { responseText: null, evidenceUrls: [], reviewStatus: null }, "DECLINED");
  await check("RECEIVED", { reviewStatus: "PENDING", publishedWithItem: false }, "RESPONDED_UNDER_REVIEW");
  await check("RECEIVED", { reviewStatus: "REJECTED", publishedWithItem: false, reviewNotes: "private editorial note" }, "RESPONDED_NOT_PUBLISHED");
  const approved = await check("RECEIVED", { reviewStatus: "APPROVED", publishedWithItem: true, reviewNotes: "private editorial note", reviewedById: sub.id }, "RESPONDED");
  assert.equal(approved.item.response.responseText, "Our reply text");
  assert.deepEqual(approved.item.response.evidenceUrls, ["https://proof.example"]);
  // unapproved reply text never leaks, even though the row has it
  const pending = await check("RECEIVED", { reviewStatus: "PENDING", publishedWithItem: false }, "RESPONDED_UNDER_REVIEW");
  assert.ok(!JSON.stringify(pending).includes("Our reply text"));
  // approved-but-unpublished (publishedWithItem=false) is also withheld
  const inconsistent = await check("RECEIVED", { reviewStatus: "APPROVED", publishedWithItem: false }, "RESPONDED_UNDER_REVIEW");
  assert.ok(!JSON.stringify(inconsistent).includes("Our reply text"));

  // incident view
  const inc = await prisma.incident.create({ data: { leaderId: leader.id, submitterId: sub.id, category: "SCANDAL_MORAL", dimension: "BEHAVIORAL", title: "An incident", description: "What happened", occurredAt: new Date("2022-05-05"), severity: 3, state: "VERIFIED", replyStatus: "EXPIRED" } });
  const incBody = await (await incGet(inc.id)).json();
  assert.equal(incBody.item.title, "An incident");
  assert.equal(incBody.item.isAllegationOnly, true);
  assert.equal(incBody.item.response.status, "NO_RESPONSE");
  const hidden = await prisma.incident.create({ data: { leaderId: leader.id, submitterId: sub.id, category: "SCANDAL_MORAL", dimension: "BEHAVIORAL", title: "t", description: "d", occurredAt: new Date(), severity: 1, state: "IN_REVIEW" } });
  assert.equal((await incGet(hidden.id)).status, 404);

  // nothing internal anywhere in any payload
  for (const payload of [body, approved, pending, incBody]) {
    const keys = keysOf(payload);
    for (const k of FORBIDDEN_KEYS) assert.ok(!keys.has(k), `forbidden key leaked: ${k}`);
    const text = JSON.stringify(payload);
    for (const secret of [`secret.${tag}@t.io`, `h${tag}`, "private@org.example", "private editorial note", sub.id]) assert.ok(!text.includes(secret), `leaked value: ${secret}`);
  }
  console.log("PUBLIC ITEM TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
