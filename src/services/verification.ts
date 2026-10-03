import { Prisma, PublishState, ReplyStatus, Role, VoteValue } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { countIndependentSources, type EvidenceLite } from "./evidence";
import { handleItemStatusChange } from "./scoring";

export type VerificationErrorCode = "INVALID" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "UPSTREAM";
export const HTTP_STATUS: Record<VerificationErrorCode, number> = {
  INVALID: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, RATE_LIMITED: 429, UPSTREAM: 502,
};
export class VerificationError extends Error {
  constructor(public code: VerificationErrorCode, message: string) {
    super(message);
  }
}

export type TargetType = "CLAIM" | "INCIDENT";

/** Why a failed prediction cannot be verified yet. */
export type TargetDateIssue = { kind: "MISSING" } | { kind: "NOT_PASSED"; date: Date };

/**
 * A prediction can only be verified as FAILED once its target date has passed. The date must exist, and
 * the day it names must have ENDED (UTC): a prediction due on 2 October is not failed at 00:01 on 2 October.
 * Other outcomes are not subject to this rule. Returns undefined when the rule is satisfied.
 */
export function checkPredictionTargetDate(outcome: string, targetDate: Date | null, now: Date): TargetDateIssue | undefined {
  if (outcome !== "FAILED") return undefined;
  if (!targetDate) return { kind: "MISSING" };
  const endOfTargetDay = Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate() + 1);
  return now.getTime() >= endOfTargetDay ? undefined : { kind: "NOT_PASSED", date: targetDate };
}

/** What an IN_REVIEW item still lacks before it can verify. Structured so any language can render it. */
export type MissingRequirement =
  | { code: "SOURCES"; count: number }
  | { code: "STRONG_SOURCE" }
  | { code: "CONFIRMS"; count: number }
  | { code: "SPECIFICITY" }
  | { code: "TARGET_DATE"; issue: TargetDateIssue }
  | { code: "REPLY_NOT_OFFERED" }
  | { code: "REPLY_WINDOW_OPEN" };

export interface VerificationResult {
  isVerified: boolean;
  state: PublishState;
  independentSourceCount: number;
  confirmVotes: number;
  rejectVotes: number;
  /** English summary for API clients; derived from the structured fields below. */
  reason: string;
  missing: MissingRequirement[];
  /** Conflicting confirm/reject votes: the item stays in review until an editor decides. */
  escalated: boolean;
  /** Set when an editor has resolved a vote conflict (CONFIRM replaces only the vote requirement). */
  editorResolved: "CONFIRM" | "REJECT" | null;
  /** Evidence that exists but does NOT count: not archived, or social/screenshot only. */
  ignoredEvidence: { unarchived: number; unsupported: number };
}

const missingToEnglish = (m: MissingRequirement): string => {
  switch (m.code) {
    case "SOURCES": return `${m.count} more independent archived source(s)`;
    case "STRONG_SOURCE": return "at least one primary or tier-1 source";
    case "CONFIRMS": return `${m.count} more reviewer confirmation(s)`;
    case "SPECIFICITY": return `claim specificity >= ${MIN_SPECIFICITY} for a failed/modified outcome`;
    case "TARGET_DATE": return m.issue.kind === "MISSING" ? "a target date on the prediction (required for a failed outcome)" : `the target date (${m.issue.date.toISOString().slice(0, 10)}) to have passed`;
    case "REPLY_NOT_OFFERED": return "right-of-reply offered and its window closed or answered";
    case "REPLY_WINDOW_OPEN": return "right-of-reply window to close";
  }
};

const REVIEWER_ROLES: Role[] = ["REVIEWER", "EDITOR", "ADMIN"];
const REPLY_DONE: ReplyStatus[] = ["RECEIVED", "DECLINED", "EXPIRED"];
const REQUIRED_SOURCES = 2;
const REQUIRED_CONFIRMS = 2;
const REQUIRED_REJECTS = 2;
export const MIN_SPECIFICITY = 0.6;

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
  /** Claims only: set when a FAILED outcome's target date is missing or not yet passed. */
  targetDateIssue?: TargetDateIssue;
  /** An editor's decision on conflicting votes. CONFIRM waives only the vote requirement; REJECT rejects. */
  editorResolution?: "CONFIRM" | "REJECT" | null;
  now: Date;
}

/**
 * Pure decision function (no I/O) so the rules are unit-testable.
 * Independent source = distinct ownership group (or publisher), archived, not social/screenshot,
 * and at least one of them must be PRIMARY or TIER1_MEDIA.
 */

export function evaluate(i: EvalInput): VerificationResult {
  const { independent, hasStrong } = countIndependentSources(i.evidence);

  const valid = i.votes.filter((v) => !v.conflictDeclared);
  const confirms = valid.filter((v) => v.value === "CONFIRM").length;
  const rejects = valid.filter((v) => v.value === "REJECT").length;

  const ignoredEvidence = {
    unarchived: i.evidence.filter((e) => e.tier !== "SOCIAL" && e.kind !== "SCREENSHOT" && !(e.archiveUrl && e.sha256)).length,
    unsupported: i.evidence.filter((e) => e.tier === "SOCIAL" || e.kind === "SCREENSHOT").length,
  };

  const out = (state: PublishState, reason: string, missing: MissingRequirement[] = [], escalated = false): VerificationResult => ({
    isVerified: state === "VERIFIED",
    state,
    independentSourceCount: independent,
    confirmVotes: confirms,
    rejectVotes: rejects,
    reason,
    missing,
    escalated,
    editorResolved: i.editorResolution ?? null,
    ignoredEvidence,
  });

  // Votes only move items that are currently under review; never silently un-verify or un-dispute.
  if (i.state !== "IN_REVIEW") return out(i.state, `No change: item is ${i.state}.`);

  if (i.editorResolution === "REJECT") return out("REJECTED", "Rejected by editorial decision.");
  const editorConfirmed = i.editorResolution === "CONFIRM";

  if (!editorConfirmed) {
    if (confirms >= REQUIRED_CONFIRMS && rejects >= REQUIRED_REJECTS) {
      return out("IN_REVIEW", "Conflicting votes: escalated to an editor.", [], true);
    }
    if (rejects >= REQUIRED_REJECTS) return out("REJECTED", "Rejected by reviewer consensus.");
  }

  const missing: MissingRequirement[] = [];
  if (independent < REQUIRED_SOURCES) missing.push({ code: "SOURCES", count: REQUIRED_SOURCES - independent });
  else if (!hasStrong) missing.push({ code: "STRONG_SOURCE" });
  // An editor's CONFIRM stands in for the vote requirement only; every other requirement still applies.
  if (!editorConfirmed && confirms < REQUIRED_CONFIRMS) missing.push({ code: "CONFIRMS", count: REQUIRED_CONFIRMS - confirms });
  if (!i.specificityOk) missing.push({ code: "SPECIFICITY" });
  if (i.targetDateIssue) missing.push({ code: "TARGET_DATE", issue: i.targetDateIssue });

  const replyOpen =
    i.replyStatus === "OFFERED" && !!i.replyDeadline && i.replyDeadline > i.now;
  if (i.replyRequired && !REPLY_DONE.includes(i.replyStatus) && !(i.replyStatus === "OFFERED" && i.replyDeadline && i.replyDeadline <= i.now)) {
    missing.push({ code: "REPLY_NOT_OFFERED" });
  } else if (replyOpen) {
    missing.push({ code: "REPLY_WINDOW_OPEN" });
  }

  if (missing.length === 0) return out("VERIFIED", "Verified: independent sources, reviewer confirmations and reply window satisfied.");
  return out("IN_REVIEW", `Incomplete: needs ${missing.map(missingToEnglish).join("; ")}.`, missing);
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
    if (!rationale.trim()) throw new VerificationError("INVALID", "A rationale is required.");

    return prisma.$transaction(
      async (tx) => {
        const reviewer = await tx.user.findUnique({ where: { id: reviewerId } });
        if (!reviewer || !REVIEWER_ROLES.includes(reviewer.role)) {
          throw new VerificationError("FORBIDDEN", "Reviewer role required.");
        }
        if (reviewer.suspendedUntil && reviewer.suspendedUntil > new Date()) {
          throw new VerificationError("FORBIDDEN", "Account suspended.");
        }

        const target =
          targetType === "CLAIM"
            ? await tx.claim.findUnique({ where: { id: targetId }, select: { submitterId: true, state: true } })
            : await tx.incident.findUnique({ where: { id: targetId }, select: { submitterId: true, state: true } });
        if (!target) throw new VerificationError("NOT_FOUND", `${targetType} not found.`);
        if (target.submitterId === reviewerId) throw new VerificationError("FORBIDDEN", "Reviewers cannot verify their own submissions.");
        if (target.state !== "IN_REVIEW") throw new VerificationError("CONFLICT", `Item is ${target.state}; votes are only accepted while IN_REVIEW.`);

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
    /** Re-evaluate a DISPUTED item from scratch (as if IN_REVIEW) instead of leaving it untouched. */
    reopen = false,
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
        state: reopen ? "IN_REVIEW" : c.state,
        evidence: c.evidence,
        votes: c.votes,
        replyStatus: c.replyStatus,
        replyDeadline: c.replyDeadline,
        replyRequired: false,
        specificityOk: !needsSpecificity || c.specificity >= MIN_SPECIFICITY,
        targetDateIssue: checkPredictionTargetDate(c.outcome, c.targetDate, now),
        editorResolution: c.editorResolution,
        now,
      });
      if (r.state !== c.state) {
        await db.claim.update({ where: { id: c.id }, data: { state: r.state } });
        await handleItemStatusChange(db, c.leaderId, c.state, r.state);
      }
      return r;
    }
    const inc = await db.incident.findUnique({
      where: { id: targetId },
      include: { evidence: true, votes: true },
    });
    if (!inc) throw new Error(`Incident not found: ${targetId}`);
    const r = evaluate({
      state: reopen ? "IN_REVIEW" : inc.state,
      evidence: inc.evidence,
      votes: inc.votes,
      replyStatus: inc.replyStatus,
      replyDeadline: inc.replyDeadline,
      replyRequired: true, // incidents always require right of reply
      specificityOk: true,
      editorResolution: inc.editorResolution,
      now,
    });
    if (r.state !== inc.state) {
      await db.incident.update({ where: { id: inc.id }, data: { state: r.state } });
      await handleItemStatusChange(db, inc.leaderId, inc.state, r.state);
    }
    return r;
  }

}
