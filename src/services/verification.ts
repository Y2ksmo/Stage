import { Prisma, PublishState, ReplyStatus, Role, SourceTier, VoteValue, EvidenceKind } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type TargetType = "CLAIM" | "INCIDENT";

export interface VerificationResult {
  isVerified: boolean;
  state: PublishState;
  independentSourceCount: number;
  confirmVotes: number;
  rejectVotes: number;
  reason: string;
}

const REVIEWER_ROLES: Role[] = ["REVIEWER", "EDITOR", "ADMIN"];
const REPLY_DONE: ReplyStatus[] = ["RECEIVED", "DECLINED", "EXPIRED"];
const REQUIRED_SOURCES = 2;
const REQUIRED_CONFIRMS = 2;
const REQUIRED_REJECTS = 2;
const MIN_SPECIFICITY = 0.6;

interface EvidenceLite {
  tier: SourceTier;
  kind: EvidenceKind;
  publisherKey: string;
  ownershipGroup: string | null;
  archiveUrl: string | null;
  sha256: string | null;
}
interface VoteLite {
  reviewerId: string;
  value: VoteValue;
  conflictDeclared: boolean;
}
interface EvalInput {
  state: PublishState;
  evidence: EvidenceLite[];
  votes: VoteLite[];
  replyStatus: ReplyStatus;
  replyDeadline: Date | null;
  replyRequired: boolean;
  /** Claims only: failed/modified outcomes need an adequately specific prediction. */
  specificityOk: boolean;
  now: Date;
}

/**
 * Pure decision function (no I/O) so the rules are unit-testable.
 * Independent source = distinct ownership group (or publisher), archived, not social/screenshot,
 * and at least one of them must be PRIMARY or TIER1_MEDIA.
 */
export function evaluate(i: EvalInput): VerificationResult {
  const counted = i.evidence.filter(
    (e) => e.tier !== "SOCIAL" && e.kind !== "SCREENSHOT" && e.archiveUrl && e.sha256,
  );
  const groups = new Map<string, SourceTier[]>();
  for (const e of counted) {
    const k = (e.ownershipGroup ?? e.publisherKey).toLowerCase();
    groups.set(k, [...(groups.get(k) ?? []), e.tier]);
  }
  const independent = groups.size;
  const hasStrong = [...groups.values()].some((t) => t.some((x) => x === "PRIMARY" || x === "TIER1_MEDIA"));

  const valid = i.votes.filter((v) => !v.conflictDeclared);
  const confirms = valid.filter((v) => v.value === "CONFIRM").length;
  const rejects = valid.filter((v) => v.value === "REJECT").length;

  const out = (state: PublishState, reason: string): VerificationResult => ({
    isVerified: state === "VERIFIED",
    state,
    independentSourceCount: independent,
    confirmVotes: confirms,
    rejectVotes: rejects,
    reason,
  });

  // Votes only move items that are currently under review; never silently un-verify or un-dispute.
  if (i.state !== "IN_REVIEW") return out(i.state, `No change: item is ${i.state}.`);

  if (confirms >= REQUIRED_CONFIRMS && rejects >= REQUIRED_REJECTS) {
    return out("IN_REVIEW", "Conflicting votes: escalated to an editor.");
  }
  if (rejects >= REQUIRED_REJECTS) return out("REJECTED", "Rejected by reviewer consensus.");

  const missing: string[] = [];
  if (independent < REQUIRED_SOURCES) missing.push(`${REQUIRED_SOURCES - independent} more independent archived source(s)`);
  else if (!hasStrong) missing.push("at least one primary or tier-1 source");
  if (confirms < REQUIRED_CONFIRMS) missing.push(`${REQUIRED_CONFIRMS - confirms} more reviewer confirmation(s)`);
  if (!i.specificityOk) missing.push(`claim specificity >= ${MIN_SPECIFICITY} for a failed/modified outcome`);

  const replyOpen =
    i.replyStatus === "OFFERED" && !!i.replyDeadline && i.replyDeadline > i.now;
  if (i.replyRequired && !REPLY_DONE.includes(i.replyStatus) && !(i.replyStatus === "OFFERED" && i.replyDeadline && i.replyDeadline <= i.now)) {
    missing.push("right-of-reply offered and its window closed or answered");
  } else if (replyOpen) {
    missing.push("right-of-reply window to close");
  }

  if (missing.length === 0) return out("VERIFIED", "Verified: independent sources, reviewer confirmations and reply window satisfied.");
  return out("IN_REVIEW", `Incomplete: needs ${missing.join("; ")}.`);
}

export class VerificationService {
  /** DRAFT -> IN_REVIEW once at least one evidence item is attached. */
  static async submitForReview(targetType: TargetType, targetId: string) {
    const where = { id: targetId, state: "DRAFT" as const };
    const count = await prisma.evidence.count({
      where: targetType === "CLAIM" ? { claimId: targetId } : { incidentId: targetId },
    });
    if (count < 1) throw new Error("At least one evidence item is required before review.");
    const res =
      targetType === "CLAIM"
        ? await prisma.claim.updateMany({ where, data: { state: "IN_REVIEW" } })
        : await prisma.incident.updateMany({ where, data: { state: "IN_REVIEW" } });
    if (res.count === 0) throw new Error("Item not found or not in DRAFT.");
  }

  static async castVote(params: {
    reviewerId: string;
    targetType: TargetType;
    targetId: string;
    value: VoteValue;
    rationale: string;
    conflictDeclared?: boolean;
  }): Promise<VerificationResult> {
    const { reviewerId, targetType, targetId, value, rationale } = params;
    if (!rationale.trim()) throw new Error("A rationale is required.");

    return prisma.$transaction(
      async (tx) => {
        const reviewer = await tx.user.findUnique({ where: { id: reviewerId } });
        if (!reviewer || !REVIEWER_ROLES.includes(reviewer.role)) {
          throw new Error("Unauthorized: reviewer role required.");
        }
        if (reviewer.suspendedUntil && reviewer.suspendedUntil > new Date()) {
          throw new Error("Unauthorized: account suspended.");
        }

        const target =
          targetType === "CLAIM"
            ? await tx.claim.findUnique({ where: { id: targetId }, select: { submitterId: true, state: true } })
            : await tx.incident.findUnique({ where: { id: targetId }, select: { submitterId: true, state: true } });
        if (!target) throw new Error(`${targetType} not found: ${targetId}`);
        if (target.submitterId === reviewerId) throw new Error("Reviewers cannot verify their own submissions.");
        if (target.state !== "IN_REVIEW") throw new Error(`Item is ${target.state}; votes are only accepted while IN_REVIEW.`);

        const ref = targetType === "CLAIM" ? { claimId: targetId } : { incidentId: targetId };
        const data = {
          value,
          rationale,
          conflictDeclared: params.conflictDeclared ?? false,
          weight: Math.max(0.1, reviewer.reputation / 50),
        };
        const existing = await tx.verificationVote.findFirst({ where: { reviewerId, ...ref } });
        if (existing) await tx.verificationVote.update({ where: { id: existing.id }, data });
        else await tx.verificationVote.create({ data: { reviewerId, ...ref, ...data } });

        return VerificationService.evaluateAndSetState(targetType, targetId, tx);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  static async evaluateAndSetState(
    targetType: TargetType,
    targetId: string,
    db: Prisma.TransactionClient | typeof prisma = prisma,
  ): Promise<VerificationResult> {
    const now = new Date();
    if (targetType === "CLAIM") {
      const c = await db.claim.findUnique({
        where: { id: targetId },
        include: { evidence: true, votes: true },
      });
      if (!c) throw new Error(`Claim not found: ${targetId}`);
      const needsSpecificity = c.outcome === "FAILED" || c.outcome === "MODIFIED";
      const r = evaluate({
        state: c.state,
        evidence: c.evidence,
        votes: c.votes,
        replyStatus: c.replyStatus,
        replyDeadline: c.replyDeadline,
        replyRequired: false,
        specificityOk: !needsSpecificity || c.specificity >= MIN_SPECIFICITY,
        now,
      });
      if (r.state !== c.state) await db.claim.update({ where: { id: c.id }, data: { state: r.state } });
      return r;
    }
    const inc = await db.incident.findUnique({
      where: { id: targetId },
      include: { evidence: true, votes: true },
    });
    if (!inc) throw new Error(`Incident not found: ${targetId}`);
    const r = evaluate({
      state: inc.state,
      evidence: inc.evidence,
      votes: inc.votes,
      replyStatus: inc.replyStatus,
      replyDeadline: inc.replyDeadline,
      replyRequired: true, // incidents always require right of reply
      specificityOk: true,
      now,
    });
    if (r.state !== inc.state) await db.incident.update({ where: { id: inc.id }, data: { state: r.state } });
    return r;
  }
}
