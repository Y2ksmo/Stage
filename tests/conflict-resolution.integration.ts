import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { POST } from "../src/app/api/moderation/resolve-conflict/route";
import { VerificationService } from "../src/services/verification";
import { listVerificationQueue } from "../src/services/verificationQueue";

const env = process.env as Record<string, string | undefined>;
const post = (body: unknown) => POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));
const GOOD = "Beide partijen hebben gelijk; de bronnen onderbouwen het.";

async function main() {
  const tag = Date.now().toString();
  const mk = (n: string, role: "REVIEWER" | "EDITOR" | "LEGAL" | "ADMIN" | "CONTRIBUTOR") => prisma.user.create({ data: { email: `${n}${tag}@t.io`, handle: `${n}${tag}`, role } });
  const [r1, r2, r3, r4, editor, legal, sub, otherEditor] = await Promise.all([
    mk("r1", "REVIEWER"), mk("r2", "REVIEWER"), mk("r3", "REVIEWER"), mk("r4", "REVIEWER"), mk("ed", "EDITOR"), mk("lg", "LEGAL"), mk("sb", "CONTRIBUTOR"), mk("oe", "EDITOR")]);
  const leader = await prisma.leader.create({ data: { slug: `cr${tag}`, displayName: "CR", aliases: [], publicProfileUrls: [] } });
  const addSources = async (claimId: string) => {
    for (const k of ["nos.example", "rtl.example"]) await prisma.evidence.create({ data: { uploaderId: sub.id, claimId, kind: "URL", url: `https://${k}`, archiveUrl: `https://arc/${k}`, sha256: "ab".repeat(32), tier: "TIER1_MEDIA", publisherKey: k } });
  };
  // 2 confirms + 2 rejects with NO sources: the votes conflict and nothing can verify yet
  const conflicted = async (submitterId = sub.id) => {
    const c = await prisma.claim.create({ data: { leaderId: leader.id, submitterId, statementText: `c-${Math.random()}`, dateMade: new Date(), sourceUrl: "https://a.example", state: "IN_REVIEW" } });
    for (const [r, v] of [[r1, "CONFIRM"], [r2, "CONFIRM"], [r3, "REJECT"], [r4, "REJECT"]] as const) await VerificationService.castVote({ reviewerId: r.id, targetType: "CLAIM", targetId: c.id, value: v, rationale: "x" });
    return c;
  };
  const row = (id: string) => prisma.claim.findUniqueOrThrow({ where: { id } });

  // --- the conflict is detected and surfaced ---
  const a = await conflicted();
  const q = (await listVerificationQueue(r1.id, 5000)).find((i) => i.itemId === a.id)!;
  assert.equal(q.escalated, true);
  assert.match(q.progress, /Tegenstrijdige stemmen/);

  // --- authorization and input rules (via the route) ---
  env.PFPA_DEV_USER_ID = r1.id;
  assert.equal((await post({ itemType: "CLAIM", itemId: a.id, decision: "REJECT", rationale: GOOD, noConflict: true })).status, 403); // reviewer
  env.PFPA_DEV_USER_ID = legal.id;
  assert.equal((await post({ itemType: "CLAIM", itemId: a.id, decision: "REJECT", rationale: GOOD, noConflict: true })).status, 403); // legal is not an editor
  delete env.PFPA_DEV_USER_ID;
  assert.equal((await post({ itemType: "CLAIM", itemId: a.id, decision: "REJECT", rationale: GOOD, noConflict: true })).status, 401);
  env.PFPA_DEV_USER_ID = editor.id;
  assert.equal((await post({ itemType: "CLAIM", itemId: a.id, decision: "MAYBE", rationale: GOOD })).status, 400);
  assert.equal((await post({ itemType: "CLAIM", itemId: a.id, decision: "REJECT", rationale: "te kort", noConflict: true })).status, 400);
  assert.equal((await post({ itemType: "CLAIM", itemId: a.id, decision: "REJECT", rationale: GOOD })).status, 400); // no conflict-of-interest statement
  assert.equal((await post({ itemType: "CLAIM", itemId: "nope", decision: "REJECT", rationale: GOOD, noConflict: true })).status, 404);
  assert.equal((await row(a.id)).state, "IN_REVIEW"); // nothing changed by any rejected attempt

  // an editor cannot decide their own submission
  const own = await conflicted(editor.id);
  assert.equal((await post({ itemType: "CLAIM", itemId: own.id, decision: "CONFIRM", rationale: GOOD, noConflict: true })).status, 403);

  // not in conflict -> refused
  const calm = await prisma.claim.create({ data: { leaderId: leader.id, submitterId: sub.id, statementText: "calm", dateMade: new Date(), sourceUrl: "https://a.example", state: "IN_REVIEW" } });
  assert.equal((await post({ itemType: "CLAIM", itemId: calm.id, decision: "CONFIRM", rationale: GOOD, noConflict: true })).status, 409);

  // --- REJECT ---
  const rej = await post({ itemType: "CLAIM", itemId: a.id, decision: "REJECT", rationale: GOOD, noConflict: true });
  assert.equal(rej.status, 200);
  const ra = await row(a.id);
  assert.equal(ra.state, "REJECTED");
  assert.equal(ra.editorResolution, "REJECT");
  assert.equal(ra.resolvedById, editor.id);
  assert.equal(ra.resolutionNote, GOOD);
  const audit = await prisma.moderationAction.findFirstOrThrow({ where: { targetId: a.id, action: "CONFLICT_RESOLVED_REJECT" } });
  assert.match(audit.reason, /2 bevestigd, 2 afgewezen/);
  for (const r of [r1, r2, r3, r4]) assert.ok(!audit.reason.includes(r.id), "audit must not reveal who voted how");
  assert.equal((await post({ itemType: "CLAIM", itemId: a.id, decision: "CONFIRM", rationale: GOOD, noConflict: true })).status, 409); // one decision per conflict

  // --- CONFIRM must NOT bypass the evidence rules ---
  const b = await conflicted(); // no sources
  const conf = await post({ itemType: "CLAIM", itemId: b.id, decision: "CONFIRM", rationale: GOOD, noConflict: true });
  assert.equal(conf.status, 200);
  const cb = await conf.json();
  assert.equal(cb.result.state, "IN_REVIEW", "an editor cannot publish an item that lacks sources");
  assert.deepEqual(cb.result.missing.map((m: { code: string }) => m.code), ["SOURCES"]); // the vote requirement is waived, nothing else
  assert.equal((await row(b.id)).editorResolution, "CONFIRM");
  const queued = (await listVerificationQueue(r1.id, 5000)).find((i) => i.itemId === b.id)!;
  assert.equal(queued.editorResolved, "CONFIRM");
  assert.equal(queued.escalated, false);
  assert.match(queued.progress, /Een redacteur heeft de tegenstrijdige stemmen beslecht \(bevestigd\)/);
  assert.match(queued.progress, /2 extra onafhankelijke, gearchiveerde bronnen/);

  // when the evidence arrives, the stored decision lets it verify automatically, and the score is recomputed
  await addSources(b.id);
  const before = await prisma.scoreSnapshot.count({ where: { leaderId: leader.id } });
  assert.equal((await VerificationService.evaluateAndSetState("CLAIM", b.id)).state, "VERIFIED");
  assert.equal(await prisma.scoreSnapshot.count({ where: { leaderId: leader.id } }), before + 1);

  // --- CONFIRM with everything else already in order verifies immediately ---
  // (a conflict can only arise while a requirement is still missing; here the sources arrive before the editor decides)
  const c = await conflicted();
  await addSources(c.id);
  assert.equal((await row(c.id)).state, "IN_REVIEW"); // still escalated: the conflict is checked before anything else
  env.PFPA_DEV_USER_ID = editor.id;
  const snapsBefore = await prisma.scoreSnapshot.count({ where: { leaderId: leader.id } });
  const cc = await (await post({ itemType: "CLAIM", itemId: c.id, decision: "CONFIRM", rationale: GOOD, noConflict: true })).json();
  assert.equal(cc.result.state, "VERIFIED");
  assert.equal((await row(c.id)).state, "VERIFIED");
  assert.equal(await prisma.scoreSnapshot.count({ where: { leaderId: leader.id } }), snapsBefore + 1);

  // --- the same rule for incidents: reply window still required after an editor CONFIRM ---
  const inc = await prisma.incident.create({ data: { leaderId: leader.id, submitterId: sub.id, category: "SCANDAL_MORAL", dimension: "BEHAVIORAL", title: "inc", description: "d", occurredAt: new Date(), severity: 2, state: "IN_REVIEW" } });
  for (const [r, v] of [[r1, "CONFIRM"], [r2, "CONFIRM"], [r3, "REJECT"], [r4, "REJECT"]] as const) await VerificationService.castVote({ reviewerId: r.id, targetType: "INCIDENT", targetId: inc.id, value: v, rationale: "x" });
  for (const k of ["nos.example", "rtl.example"]) await prisma.evidence.create({ data: { uploaderId: sub.id, incidentId: inc.id, kind: "URL", url: `https://${k}`, archiveUrl: `https://arc/${k}`, sha256: "ab".repeat(32), tier: "TIER1_MEDIA", publisherKey: k } });
  env.PFPA_DEV_USER_ID = otherEditor.id;
  const ir = await (await post({ itemType: "INCIDENT", itemId: inc.id, decision: "CONFIRM", rationale: GOOD, noConflict: true })).json();
  assert.equal(ir.result.state, "IN_REVIEW");
  assert.deepEqual(ir.result.missing.map((m: { code: string }) => m.code), ["REPLY_NOT_OFFERED"]); // sources fine, reply still required
  console.log("CONFLICT RESOLUTION TESTS PASSED");
}
main().then(() => prisma.$disconnect(), async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
