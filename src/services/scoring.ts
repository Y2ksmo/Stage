import type { Prisma } from "@prisma/client";
import type { prisma } from "../lib/prisma";
import {
  calculateRiskScore,
  type BiteCategory,
  type BiteItem,
  type IncidentDimension,
  type ScoreInput,
  type ScoreResult,
} from "../scoring/riskScore";
import type { PublishState } from "@prisma/client";
import { countIndependentSources } from "./evidence";

type Db = Prisma.TransactionClient | typeof prisma;

const SCORED_DIMENSIONS: string[] = ["FINANCIAL", "BEHAVIORAL", "DOCTRINAL"];
const BITE_CATEGORIES: string[] = ["BEHAVIOR", "INFORMATION", "THOUGHT", "EMOTIONAL"];

/** Load a leader's VERIFIED data and map DB rows to the scoring engine's input. */
export async function buildScoreInput(db: Db, leaderId: string, now = new Date()): Promise<ScoreInput> {
  const [claims, incidents, reviews, affiliations] = await Promise.all([
    db.claim.findMany({ where: { leaderId, state: "VERIFIED" } }),
    db.incident.findMany({ where: { leaderId, state: "VERIFIED" }, include: { evidence: true } }),
    db.review.findMany({
      where: { leaderId, kind: "BITE_ASSESSMENT", state: "VERIFIED" },
      include: { biteItems: true },
    }),
    db.affiliation.findMany({ where: { leaderId, endedAt: null }, include: { org: true } }),
  ]);

  const bite: BiteItem[] = reviews.flatMap((r) =>
    r.biteItems
      .filter((b) => BITE_CATEGORIES.includes(b.category) && b.rating >= 0 && b.rating <= 3)
      .map((b) => ({ category: b.category as BiteCategory, rating: b.rating as 0 | 1 | 2 | 3, verified: true })),
  );

  return {
    now,
    claims: claims.map((c) => ({
      outcome: c.outcome,
      specificity: c.specificity,
      targetDate: c.targetDate,
      verified: true,
    })),
    incidents: incidents
      .filter((i) => SCORED_DIMENSIONS.includes(i.dimension))
      .map((i) => ({
        dimension: i.dimension as IncidentDimension,
        severity: Math.min(5, Math.max(1, i.severity)) as 1 | 2 | 3 | 4 | 5,
        occurredAt: i.occurredAt,
        verified: true,
        independentSources: countIndependentSources(i.evidence).independent,
        replyOffered: i.replyStatus !== "NOT_OFFERED",
        officialFinding: i.officialFinding,
      })),
    bite,
    // null (unknown) when the leader has no affiliated organisation on record.
    financial: {
      publicAudit: affiliations.length === 0 ? null : affiliations.some((a) => a.org.publishesAudit),
    },
  };
}

/** Recompute and append an immutable ScoreSnapshot. Call inside the same transaction as the state change. */
export async function recomputeLeaderScore(db: Db, leaderId: string): Promise<ScoreResult> {
  const result = calculateRiskScore(await buildScoreInput(db, leaderId));
  await db.scoreSnapshot.create({
    data: {
      leaderId,
      riskScore: result.riskScore, // null => "Insufficient data"
      band: result.band,
      confidence: result.confidence,
      dimensions: result.dimensions as unknown as Prisma.InputJsonValue,
      methodologyVersion: result.methodologyVersion,
    },
  });
  return result;
}

export async function latestScore(db: Db, leaderId: string) {
  return db.scoreSnapshot.findFirst({ where: { leaderId }, orderBy: { computedAt: "desc" } });
}

/**
 * Call after ANY state change on a Claim or Incident (verification, takedown, editor action).
 * Only VERIFIED items are scored, so entering or leaving VERIFIED changes the score;
 * e.g. VERIFIED -> DISPUTED/WITHDRAWN removes the item from it.
 */
export async function handleItemStatusChange(
  db: Db,
  leaderId: string,
  previousStatus: PublishState,
  newStatus: PublishState,
) {
  if (previousStatus !== newStatus && (previousStatus === "VERIFIED" || newStatus === "VERIFIED")) {
    await recomputeLeaderScore(db, leaderId);
  }
}
