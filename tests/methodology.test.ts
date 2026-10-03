import assert from "node:assert/strict";
import { BAND_THRESHOLDS, WEIGHTS, calculateRiskScore } from "../src/scoring/riskScore";

// The methodology page prints these constants directly, so they must be internally consistent.
const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
assert.ok(Math.abs(sum - 1) < 1e-9, `weights must sum to 100% (got ${sum})`);
assert.ok(BAND_THRESHOLDS.ELEVATED < BAND_THRESHOLDS.HIGH && BAND_THRESHOLDS.HIGH < BAND_THRESHOLDS.SEVERE);

// The published band thresholds are the ones the engine actually uses (guards against page/engine drift).
const now = new Date("2026-01-01");
const claim = (outcome: "FAILED" | "FULFILLED") => ({ outcome, specificity: 1, targetDate: new Date("2020-01-01"), verified: true });
const run = (failed: number, ok: number) => calculateRiskScore({ now, claims: [...Array(failed).fill(0).map(() => claim("FAILED")), ...Array(ok).fill(0).map(() => claim("FULFILLED"))], incidents: [{ dimension: "FINANCIAL", severity: 3, occurredAt: now, verified: true, independentSources: 2, replyOffered: true, officialFinding: false }], bite: [], financial: { publicAudit: true } });
const r = run(10, 0);
assert.ok(r.riskScore !== null);
const expected = r.riskScore! < BAND_THRESHOLDS.ELEVATED ? "LOW" : r.riskScore! < BAND_THRESHOLDS.HIGH ? "ELEVATED" : r.riskScore! < BAND_THRESHOLDS.SEVERE ? "HIGH" : "SEVERE";
assert.equal(r.band, expected);
console.log("METHODOLOGY CONSTANT TESTS PASSED");
