import assert from "node:assert/strict";
import { checkPredictionTargetDate, evaluate } from "../src/services/verification";
import { summarizeVerificationNl } from "../src/services/verificationStatus";

type Ev = Parameters<typeof evaluate>[0]["evidence"][number];
const ev = (key: string, o: Partial<Ev> = {}): Ev => ({ tier: "TIER1_MEDIA", kind: "URL", publisherKey: key, ownershipGroup: null, archiveUrl: `https://arc/${key}`, sha256: "ab".repeat(32), ...o });
const vote = (id: string, value: "CONFIRM" | "REJECT" | "NEEDS_MORE", conflictDeclared = false) => ({ reviewerId: id, value, conflictDeclared });
const base = { state: "IN_REVIEW" as const, evidence: [] as Ev[], votes: [] as ReturnType<typeof vote>[], replyStatus: "NOT_OFFERED" as const, replyDeadline: null, replyRequired: false, specificityOk: true, now: new Date("2026-01-01") };
const nl = (o: Partial<typeof base>) => summarizeVerificationNl(evaluate({ ...base, ...o }));

// nothing yet: both source and vote requirements, plural handling
assert.equal(nl({}), "Nog nodig: 2 extra onafhankelijke, gearchiveerde bronnen; 2 extra bevestigende stemmen.");
// one source + one vote: singular
assert.equal(nl({ evidence: [ev("a")], votes: [vote("r1", "CONFIRM")] }), "Nog nodig: 1 extra onafhankelijke, gearchiveerde bron; 1 extra bevestigende stem.");
// the rule your draft got wrong: ONE source is NOT enough, even with enough votes
assert.match(nl({ evidence: [ev("a")], votes: [vote("r1", "CONFIRM"), vote("r2", "CONFIRM")] }), /^Nog nodig: 1 extra onafhankelijke, gearchiveerde bron\.$/);
// enough sources but none strong (secondary only)
assert.match(nl({ evidence: [ev("a", { tier: "SECONDARY" }), ev("b", { tier: "SECONDARY" })], votes: [vote("r1", "CONFIRM"), vote("r2", "CONFIRM")] }), /minstens één primaire bron of betrouwbaar medium/);
// unarchived and social evidence are called out as not counting
const noisy = nl({ evidence: [ev("a"), ev("b", { archiveUrl: null, sha256: null }), ev("c", { tier: "SOCIAL" })], votes: [vote("r1", "CONFIRM"), vote("r2", "CONFIRM")] });
assert.match(noisy, /1 bron is niet gearchiveerd en telt niet mee\./);
assert.match(noisy, /1 bron van sociale media of een screenshot telt niet mee\./);
// same ownership group counts once
assert.match(nl({ evidence: [ev("a", { ownershipGroup: "g" }), ev("b", { ownershipGroup: "g" })] }), /1 extra onafhankelijke/);
// incidents: reply required; open window; specificity
assert.match(nl({ replyRequired: true }), /wederhoor aanbieden en afronden/);
assert.match(nl({ replyStatus: "OFFERED", replyDeadline: new Date("2026-02-01") }), /afloop of afronding van de wederhoortermijn/);
assert.match(nl({ specificityOk: false }), /specificiteit ≥ 0,6/);
// conflicting votes
assert.equal(nl({ votes: [vote("a", "CONFIRM"), vote("b", "CONFIRM"), vote("c", "REJECT"), vote("d", "REJECT")] }), "Tegenstrijdige stemmen: voorgelegd aan een redacteur voor een besluit.");
// conflict-declared votes are ignored
assert.match(nl({ votes: [vote("a", "CONFIRM", true), vote("b", "CONFIRM", true)] }), /2 extra bevestigende stemmen/);
// terminal / non-review states
assert.equal(nl({ evidence: [ev("a"), ev("b")], votes: [vote("a", "CONFIRM"), vote("b", "CONFIRM")] }), "Geverifieerd en openbaar.");
assert.equal(nl({ votes: [vote("a", "REJECT"), vote("b", "REJECT")] }), "Afgewezen door de reviewers.");
assert.match(nl({ state: "DISPUTED" }), /Betwist/);
assert.equal(nl({ state: "WITHDRAWN" }), "Ingetrokken.");
assert.match(nl({ state: "DRAFT" }), /Concept/);

// the English API message still derives from the same data (no drift, API unchanged)
assert.match(evaluate({ ...base }).reason, /^Incomplete: needs 2 more independent archived source\(s\); 2 more reviewer confirmation\(s\)\.$/);
// --- target-date rule for failed predictions ---
const D = (iso: string) => new Date(iso);
assert.equal(checkPredictionTargetDate("FULFILLED", null, D("2026-01-01")), undefined);          // only FAILED is subject to the rule
assert.equal(checkPredictionTargetDate("PENDING", D("2099-01-01T00:00:00Z"), D("2026-01-01")), undefined);
assert.deepEqual(checkPredictionTargetDate("FAILED", null, D("2026-01-01")), { kind: "MISSING" });
assert.equal(checkPredictionTargetDate("FAILED", D("2099-01-01T00:00:00Z"), D("2026-01-01"))?.kind, "NOT_PASSED");
// the day named by the target date must have ENDED (UTC)
const target = D("2026-10-02T00:00:00Z");
assert.equal(checkPredictionTargetDate("FAILED", target, D("2026-10-02T00:01:00Z"))?.kind, "NOT_PASSED");   // not failed at 00:01 on the day itself
assert.equal(checkPredictionTargetDate("FAILED", target, D("2026-10-02T23:59:59Z"))?.kind, "NOT_PASSED");
assert.equal(checkPredictionTargetDate("FAILED", target, D("2026-10-03T00:00:00Z")), undefined);          // first moment after the day
assert.equal(checkPredictionTargetDate("FAILED", D("2026-10-02T15:30:00Z"), D("2026-10-03T00:00:00Z")), undefined); // time-of-day in the stored date is irrelevant

// it blocks verification, and the messages explain why (English API text + Dutch UI text)
const full = { evidence: [ev("a"), ev("b")], votes: [vote("r1", "CONFIRM"), vote("r2", "CONFIRM")] };
const future = checkPredictionTargetDate("FAILED", D("2026-06-15T00:00:00Z"), base.now);
const blocked = evaluate({ ...base, ...full, targetDateIssue: future });
assert.equal(blocked.state, "IN_REVIEW");
assert.equal(blocked.reason, "Incomplete: needs the target date (2026-06-15) to have passed.");
assert.equal(summarizeVerificationNl(blocked), "Nog nodig: afloop van de streefdatum (15 juni 2026).");
const undated = evaluate({ ...base, ...full, targetDateIssue: { kind: "MISSING" } });
assert.equal(undated.state, "IN_REVIEW");
assert.match(undated.reason, /a target date on the prediction/);
assert.match(summarizeVerificationNl(undated), /een streefdatum bij de voorspelling/);
assert.equal(evaluate({ ...base, ...full, targetDateIssue: undefined }).state, "VERIFIED"); // no issue => verifies as before
console.log("VERIFICATION STATUS TESTS PASSED");
