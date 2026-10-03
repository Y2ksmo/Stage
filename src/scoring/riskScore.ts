/**
 * PFPA Risk Indicator Score (0–100, higher = more risk indicators).
 *
 * Design rules (see docs/PFPA_PRD.md §5):
 *  1. Only VERIFIED evidence is scored (>=2 independent sources, enforced upstream).
 *  2. Each dimension yields a 0–100 sub-score AND a confidence (0–1).
 *  3. Dimensions with no data are EXCLUDED and weights renormalised — missing data
 *     is never treated as "clean" or "guilty".
 *  4. Low overall confidence => the UI shows "Insufficient data", not a number.
 *  5. The score is an aggregation indicator, never a verdict about a person or faith.
 */

export type OutcomeStatus = "PENDING" | "FULFILLED" | "FAILED" | "RETRACTED" | "MODIFIED";
export type Severity = 1 | 2 | 3 | 4 | 5;

export interface ScoredClaim {
  outcome: OutcomeStatus;
  /** Reviewer-rated 0–1: explicit, time-bound, falsifiable. Vague claims are excluded (<0.6). */
  specificity: number;
  targetDate: Date | null;
  verified: boolean;
}

export type IncidentDimension = "FINANCIAL" | "BEHAVIORAL" | "DOCTRINAL";

export interface ScoredIncident {
  dimension: IncidentDimension;
  severity: Severity;
  occurredAt: Date;
  verified: boolean;
  /** Count of independent publishers/primary sources behind it. */
  independentSources: number;
  /** Leader's right-of-reply was offered and recorded (not a score reduction, a confidence boost). */
  replyOffered: boolean;
  /** Court finding / audit / regulator action raises weight. */
  officialFinding: boolean;
}

export type BiteCategory = "BEHAVIOR" | "INFORMATION" | "THOUGHT" | "EMOTIONAL";

export interface BiteItem {
  category: BiteCategory;
  /** 0 = absent, 1 = mild/occasional, 2 = systematic, 3 = coercive/enforced. */
  rating: 0 | 1 | 2 | 3;
  verified: boolean;
}

export interface FinancialDisclosure {
  /** Publishes audited accounts or is regulator-filed (e.g. 990 / charity commission). null = unknown. */
  publicAudit: boolean | null;
}

export interface ScoreInput {
  claims: ScoredClaim[];
  incidents: ScoredIncident[];
  bite: BiteItem[];
  financial: FinancialDisclosure;
  now?: Date;
}

export type DimensionKey = "PREDICTION" | "FINANCIAL" | "BEHAVIORAL" | "DOCTRINAL" | "CULTIC";

export interface DimensionResult {
  key: DimensionKey;
  score: number | null; // null = no data, excluded
  confidence: number; // 0–1
  weight: number; // effective weight after renormalisation
  evidenceCount: number;
  notes: string[];
}

export interface ScoreResult {
  riskScore: number | null; // null when insufficient data
  authenticityScore: number | null; // 100 - risk (display convenience)
  band: "INSUFFICIENT_DATA" | "LOW" | "ELEVATED" | "HIGH" | "SEVERE";
  confidence: number;
  dimensions: DimensionResult[];
  methodologyVersion: string;
}

export const METHODOLOGY_VERSION = "1.0.0";

export const WEIGHTS: Record<DimensionKey, number> = {
  PREDICTION: 0.25,
  FINANCIAL: 0.2,
  BEHAVIORAL: 0.2,
  DOCTRINAL: 0.15,
  CULTIC: 0.2,
};

/** Below this overall confidence (or with fewer than 2 dimensions of data) no score is shown. */
export const MIN_OVERALL_CONFIDENCE = 0.25;
/** Score bands: [0, ELEVATED) low, [ELEVATED, HIGH) elevated, [HIGH, SEVERE) high, SEVERE and up severe. */
export const BAND_THRESHOLDS = { ELEVATED: 25, HIGH: 50, SEVERE: 75 } as const;
const MIN_DIMENSIONS_WITH_DATA = 2;
const SEVERITY_WEIGHT: Record<Severity, number> = { 1: 0.1, 2: 0.25, 3: 0.45, 4: 0.7, 5: 0.9 };
export const HALF_LIFE_YEARS = 7; // old incidents decay but never vanish (floor below)
const RECENCY_FLOOR = 0.35;

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const yearsBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / (365.25 * 24 * 3600 * 1000);
/** Saturating confidence: n pieces of evidence -> 0..1, ~0.63 at n = k. */
const sat = (n: number, k: number) => 1 - Math.exp(-n / k);

/* ------------------------------ Prediction ------------------------------ */

function predictionDimension(claims: ScoredClaim[], now: Date): DimensionResult {
  const notes: string[] = [];
  // Only verified, specific, resolved claims count. Pending claims past target date
  // are NOT auto-failed; they surface in the review queue instead.
  const resolved = claims.filter(
    (c) => c.verified && c.specificity >= 0.6 && c.outcome !== "PENDING",
  );
  const overdue = claims.filter(
    (c) => c.verified && c.outcome === "PENDING" && c.targetDate && c.targetDate < now,
  ).length;
  if (overdue) notes.push(`${overdue} verified claim(s) past target date await outcome review`);

  if (resolved.length === 0) {
    return { key: "PREDICTION", score: null, confidence: 0, weight: 0, evidenceCount: 0, notes };
  }

  let failures = 0; // weighted
  let total = 0;
  for (const c of resolved) {
    const w = c.specificity; // more specific => counts more
    total += w;
    if (c.outcome === "FAILED") failures += w;
    // Silently reinterpreting / quietly editing a prediction after the fact is a
    // distinct, weaker signal than a plain miss; a public retraction is weaker still.
    else if (c.outcome === "MODIFIED") failures += 0.7 * w;
    else if (c.outcome === "RETRACTED") failures += 0.35 * w;
  }
  // Beta(1,1)-style smoothing so 1 miss out of 1 is not 100%.
  const failRate = (failures + 1) / (total + 2);
  notes.push(`weighted failure rate ${(failRate * 100).toFixed(0)}% over ${resolved.length} resolved claims`);
  return {
    key: "PREDICTION",
    score: failRate * 100,
    confidence: sat(resolved.length, 6),
    weight: 0,
    evidenceCount: resolved.length,
    notes,
  };
}

/* ------------------------ Incident-based dimensions ---------------------- */

function incidentDimension(
  key: "FINANCIAL" | "BEHAVIORAL" | "DOCTRINAL",
  incidents: ScoredIncident[],
  now: Date,
  extra?: { publicAudit?: boolean | null },
): DimensionResult {
  const notes: string[] = [];
  const rel = incidents.filter((i) => i.dimension === key && i.verified && i.independentSources >= 2);
  const auditKnown = extra?.publicAudit === true || extra?.publicAudit === false;
  const hasAnyData = rel.length > 0 || auditKnown;
  if (!hasAnyData) {
    return { key, score: null, confidence: 0, weight: 0, evidenceCount: 0, notes };
  }

  // Noisy-OR: independent incidents compound but can never exceed 100.
  let survive = 1;
  for (const i of rel) {
    const recency = Math.max(RECENCY_FLOOR, Math.pow(0.5, yearsBetween(i.occurredAt, now) / HALF_LIFE_YEARS));
    let p = SEVERITY_WEIGHT[i.severity] * recency;
    if (i.officialFinding) p = Math.min(0.97, p * 1.25);
    survive *= 1 - p;
  }
  let score = (1 - survive) * 100;

  if (key === "FINANCIAL" && extra?.publicAudit === false) {
    score = Math.max(score, 0) + (100 - score) * 0.15; // opacity is a modest, capped uplift
    notes.push("no public audit / regulator filing found");
  }
  if (key === "FINANCIAL" && extra?.publicAudit === true) notes.push("publishes audited accounts");

  const replyBoost = rel.length ? rel.filter((i) => i.replyOffered).length / rel.length : 0;
  const confidence = clamp(sat(rel.length, 3) * (0.8 + 0.2 * replyBoost) + (auditKnown ? 0.1 : 0));
  return { key, score: clamp(score, 0, 100), confidence, weight: 0, evidenceCount: rel.length, notes };
}

/* --------------------------------- BITE ---------------------------------- */

function biteDimension(items: BiteItem[]): DimensionResult {
  const notes: string[] = [];
  const verified = items.filter((i) => i.verified);
  if (verified.length === 0) {
    return { key: "CULTIC", score: null, confidence: 0, weight: 0, evidenceCount: 0, notes };
  }
  const cats: BiteCategory[] = ["BEHAVIOR", "INFORMATION", "THOUGHT", "EMOTIONAL"];
  const perCat: number[] = [];
  for (const c of cats) {
    const rs = verified.filter((i) => i.category === c);
    if (rs.length === 0) continue;
    const mean = rs.reduce((s, r) => s + r.rating, 0) / (rs.length * 3);
    const peak = Math.max(...rs.map((r) => r.rating)) / 3;
    // A single coercive practice matters, so blend mean and peak.
    perCat.push(0.6 * mean + 0.4 * peak);
    notes.push(`${c.toLowerCase()}: ${(perCat[perCat.length - 1] * 100).toFixed(0)}`);
  }
  // Breadth across all four BITE categories is the defining feature of high-control groups.
  const breadth = perCat.filter((p) => p >= 0.34).length / 4;
  const base = perCat.reduce((s, p) => s + p, 0) / perCat.length;
  const score = clamp(0.7 * base + 0.3 * breadth) * 100;
  return {
    key: "CULTIC",
    score,
    confidence: sat(verified.length, 8) * (0.5 + 0.5 * (perCat.length / 4)),
    weight: 0,
    evidenceCount: verified.length,
    notes,
  };
}

/* ------------------------------- Aggregate ------------------------------- */

export function calculateRiskScore(input: ScoreInput): ScoreResult {
  const now = input.now ?? new Date();
  const dims: DimensionResult[] = [
    predictionDimension(input.claims, now),
    incidentDimension("FINANCIAL", input.incidents, now, { publicAudit: input.financial.publicAudit }),
    incidentDimension("BEHAVIORAL", input.incidents, now),
    incidentDimension("DOCTRINAL", input.incidents, now),
    biteDimension(input.bite),
  ];

  // Note: financial `publicAudit: true` with zero incidents yields a score of 0 with low
  // confidence, which correctly pulls the aggregate down — transparency is credit.
  const active = dims.filter((d) => d.score !== null);
  if (active.length < MIN_DIMENSIONS_WITH_DATA) {
    return {
      riskScore: null,
      authenticityScore: null,
      band: "INSUFFICIENT_DATA",
      confidence: 0,
      dimensions: dims,
      methodologyVersion: METHODOLOGY_VERSION,
    };
  }

  // Effective weight = base weight × confidence, renormalised over active dimensions.
  // Low-confidence dimensions therefore shrink toward being ignored rather than swinging the score.
  const raw = active.map((d) => WEIGHTS[d.key] * (0.4 + 0.6 * d.confidence));
  const sum = raw.reduce((a, b) => a + b, 0);
  let risk = 0;
  active.forEach((d, idx) => {
    d.weight = raw[idx] / sum;
    risk += (d.score as number) * d.weight;
  });

  const baseSum = active.reduce((s, d) => s + WEIGHTS[d.key], 0);
  const coverage = baseSum; // share of the framework that has data (0–1)
  const confidence = clamp(
    active.reduce((s, d) => s + d.confidence * WEIGHTS[d.key], 0) / baseSum * coverage,
  );

  if (confidence < MIN_OVERALL_CONFIDENCE) {
    return {
      riskScore: null,
      authenticityScore: null,
      band: "INSUFFICIENT_DATA",
      confidence,
      dimensions: dims,
      methodologyVersion: METHODOLOGY_VERSION,
    };
  }

  // Severe single-dimension override: one extreme, officially-found harm must not be
  // averaged away by clean dimensions (e.g. a proven fraud conviction).
  const peak = Math.max(...active.map((d) => d.score as number));
  const hasSevere = active.some((d) => (d.score as number) >= 85 && d.confidence >= 0.5);
  if (hasSevere) risk = Math.max(risk, 0.8 * peak);

  const r = Math.round(clamp(risk / 100) * 100);
  const band =
    r < BAND_THRESHOLDS.ELEVATED ? "LOW" : r < BAND_THRESHOLDS.HIGH ? "ELEVATED" : r < BAND_THRESHOLDS.SEVERE ? "HIGH" : "SEVERE";
  return {
    riskScore: r,
    authenticityScore: 100 - r,
    band,
    confidence,
    dimensions: dims,
    methodologyVersion: METHODOLOGY_VERSION,
  };
}
