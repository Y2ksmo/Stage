import type { EvidenceKind, ReplyStatus, SourceTier, VoteValue } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { MIN_SPECIFICITY, VerificationError, checkPredictionTargetDate, evaluate, type TargetDateIssue, type TargetType } from "./verification";
import { summarizeVerificationNl } from "./verificationStatus";

const VOTER_ROLES = ["REVIEWER", "EDITOR", "ADMIN"] as const;

export interface QueueItem {
  itemType: TargetType;
  itemId: string;
  leaderName: string;
  /** Verbatim claim text, or the incident title. */
  title: string;
  description: string | null;
  occurredOrMadeAt: Date;
  sourceUrl: string | null;
  proposedOutcome: string | null; // claims only
  specificity: number | null; // claims only
  evidence: Array<{ publisherKey: string; tier: string; url: string | null; archiveUrl: string | null; archived: boolean }>;
  independentSources: number;
  confirmVotes: number;
  rejectVotes: number;
  needsMoreVotes: number;
  myVote: "CONFIRM" | "REJECT" | "NEEDS_MORE" | null;
  /** Dutch description of what is still missing before the item can verify. */
  progress: string;
}

/**
 * Items waiting for reviewer votes (state IN_REVIEW), longest-waiting first (by when they entered the queue).
 * Excludes the reviewer's own submissions (self-review is forbidden). Only vote COUNTS are exposed,
 * never who voted how, so reviewers are not influenced by each other.
 */
export async function listVerificationQueue(userId: string, limit = 50): Promise<QueueItem[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, suspendedUntil: true } });
  if (!user || (user.suspendedUntil && user.suspendedUntil > new Date())) throw new VerificationError("FORBIDDEN", "Account geschorst of onbekend.");
  if (!(VOTER_ROLES as readonly string[]).includes(user.role)) throw new VerificationError("FORBIDDEN", "Reviewer-rol vereist.");

  const evidenceSelect = { publisherKey: true, ownershipGroup: true, tier: true, kind: true, url: true, archiveUrl: true, sha256: true } as const;
  const voteSelect = { reviewerId: true, value: true, conflictDeclared: true } as const;
  const where = { state: "IN_REVIEW" as const, submitterId: { not: userId } };
  const now = new Date();

  const [claims, incidents] = await Promise.all([
    prisma.claim.findMany({
      where, orderBy: { createdAt: "asc" }, take: limit,
      select: {
        id: true, createdAt: true, statementText: true, dateMade: true, targetDate: true, sourceUrl: true, outcome: true, specificity: true,
        replyStatus: true, replyDeadline: true, leader: { select: { displayName: true } },
        evidence: { select: evidenceSelect }, votes: { select: voteSelect },
      },
    }),
    prisma.incident.findMany({
      where, orderBy: { createdAt: "asc" }, take: limit,
      select: {
        id: true, createdAt: true, title: true, description: true, occurredAt: true,
        replyStatus: true, replyDeadline: true, leader: { select: { displayName: true } },
        evidence: { select: evidenceSelect }, votes: { select: voteSelect },
      },
    }),
  ]);

  const build = (
    itemType: TargetType, id: string, base: Pick<QueueItem, "title" | "description" | "occurredOrMadeAt" | "sourceUrl" | "proposedOutcome" | "specificity">,
    leaderName: string,
    evidence: Array<{ publisherKey: string; ownershipGroup: string | null; tier: SourceTier; kind: EvidenceKind; url: string | null; archiveUrl: string | null; sha256: string | null }>,
    votes: Array<{ reviewerId: string; value: VoteValue; conflictDeclared: boolean }>,
    reply: { replyStatus: ReplyStatus; replyDeadline: Date | null },
    specificityOk: boolean,
    targetDateIssue?: TargetDateIssue,
  ): QueueItem => {
    const result = evaluate({
      state: "IN_REVIEW",
      evidence,
      votes,
      replyStatus: reply.replyStatus,
      replyDeadline: reply.replyDeadline,
      replyRequired: itemType === "INCIDENT",
      specificityOk,
      targetDateIssue,
      now,
    });
    const counted = votes.filter((v) => !v.conflictDeclared);
    return {
      itemType, itemId: id, leaderName, ...base,
      evidence: evidence.map((e) => ({ publisherKey: e.publisherKey, tier: e.tier, url: e.url, archiveUrl: e.archiveUrl, archived: !!(e.archiveUrl && e.sha256) })),
      independentSources: result.independentSourceCount,
      confirmVotes: counted.filter((v) => v.value === "CONFIRM").length,
      rejectVotes: counted.filter((v) => v.value === "REJECT").length,
      needsMoreVotes: counted.filter((v) => v.value === "NEEDS_MORE").length,
      myVote: votes.find((v) => v.reviewerId === userId)?.value ?? null,
      progress: summarizeVerificationNl(result),
    };
  };

  const items: Array<QueueItem & { _sort: number }> = [
    ...claims.map((c) => ({
      ...build("CLAIM", c.id, { title: c.statementText, description: null, occurredOrMadeAt: c.dateMade, sourceUrl: c.sourceUrl, proposedOutcome: c.outcome, specificity: c.specificity },
        c.leader.displayName, c.evidence, c.votes, c, !(c.outcome === "FAILED" || c.outcome === "MODIFIED") || c.specificity >= MIN_SPECIFICITY,
        checkPredictionTargetDate(c.outcome, c.targetDate, now)),
      _sort: c.createdAt.getTime(),
    })),
    ...incidents.map((i) => ({
      ...build("INCIDENT", i.id, { title: i.title, description: i.description, occurredOrMadeAt: i.occurredAt, sourceUrl: null, proposedOutcome: null, specificity: null },
        i.leader.displayName, i.evidence, i.votes, i, true),
      _sort: i.createdAt.getTime(),
    })),
  ];
  return items.sort((a, b) => a._sort - b._sort).slice(0, limit).map(({ _sort, ...rest }) => rest);
}
