import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

/**
 * Public, read-only view of a Claim or Incident.
 *
 * Visibility: only VERIFIED and DISPUTED items exist publicly (DISPUTED carries a banner flag).
 * DRAFT / IN_REVIEW / REJECTED / WITHDRAWN return null (=> 404), exactly like an unknown id.
 *
 * Safety: every query uses an explicit `select` allowlist. Nothing about the submitter, reviewers,
 * votes, reply tokens, requester emails or review notes is ever selected, so it cannot leak by accident.
 */

const PUBLIC_STATES = ["VERIFIED", "DISPUTED"] as const;

const evidenceSelect = {
  kind: true, url: true, archiveUrl: true, sha256: true, tier: true, publisherKey: true, excerpt: true, retrievedAt: true,
} as const;

const replySelect = { responseText: true, evidenceUrls: true, respondedAt: true, reviewStatus: true, publishedWithItem: true } as const;

type ReplyRow = { responseText: string | null; evidenceUrls: string[]; respondedAt: Date | null; reviewStatus: string | null; publishedWithItem: boolean };

export type PublicResponse =
  | { status: "NOT_OFFERED" }
  | { status: "AWAITING_RESPONSE"; deadline: Date | null }
  | { status: "NO_RESPONSE" } // window expired without an answer
  | { status: "DECLINED" }
  | { status: "RESPONDED_UNDER_REVIEW" } // received, text not public yet
  | { status: "RESPONDED_NOT_PUBLISHED" } // received, withheld by editors
  | { status: "RESPONDED"; responseText: string; evidenceUrls: string[]; respondedAt: Date | null };

/** Turn the item's reply state plus its reply rows into what the public may see. */
export function toPublicResponse(replyStatus: string, deadline: Date | null, replies: ReplyRow[]): PublicResponse {
  switch (replyStatus) {
    case "OFFERED":
      return { status: "AWAITING_RESPONSE", deadline };
    case "EXPIRED":
      return { status: "NO_RESPONSE" };
    case "DECLINED":
      return { status: "DECLINED" };
    case "RECEIVED": {
      const latest = [...replies].filter((r) => r.respondedAt).sort((a, b) => b.respondedAt!.getTime() - a.respondedAt!.getTime())[0];
      if (!latest) return { status: "RESPONDED_UNDER_REVIEW" };
      if (latest.reviewStatus === "APPROVED" && latest.publishedWithItem && latest.responseText) {
        return { status: "RESPONDED", responseText: latest.responseText, evidenceUrls: latest.evidenceUrls, respondedAt: latest.respondedAt };
      }
      return latest.reviewStatus === "REJECTED" ? { status: "RESPONDED_NOT_PUBLISHED" } : { status: "RESPONDED_UNDER_REVIEW" };
    }
    default:
      return { status: "NOT_OFFERED" };
  }
}

const claimSelect = {
  id: true, statementText: true, summary: true, dateMade: true, targetDate: true, sourceUrl: true, sourceTimestamp: true,
  outcome: true, outcomeNote: true, outcomeDecidedAt: true, specificity: true, state: true,
  replyStatus: true, replyDeadline: true,
  leader: { select: { slug: true, displayName: true } },
  evidence: { select: evidenceSelect, orderBy: { retrievedAt: "asc" as const } },
  rightOfReply: { select: replySelect },
} satisfies Prisma.ClaimSelect;

const incidentSelect = {
  id: true, title: true, description: true, category: true, dimension: true, occurredAt: true, severity: true,
  officialFinding: true, isAllegationOnly: true, state: true, replyStatus: true, replyDeadline: true,
  leader: { select: { slug: true, displayName: true } },
  evidence: { select: evidenceSelect, orderBy: { retrievedAt: "asc" as const } },
  rightOfReply: { select: replySelect },
} satisfies Prisma.IncidentSelect;

function mapClaim(c: Prisma.ClaimGetPayload<{ select: typeof claimSelect }>) {
  const { rightOfReply, replyStatus, replyDeadline, state, ...rest } = c;
  return { ...rest, disputed: state === "DISPUTED", response: toPublicResponse(replyStatus, replyDeadline, rightOfReply) };
}
function mapIncident(i: Prisma.IncidentGetPayload<{ select: typeof incidentSelect }>) {
  const { rightOfReply, replyStatus, replyDeadline, state, ...rest } = i;
  return { ...rest, disputed: state === "DISPUTED", response: toPublicResponse(replyStatus, replyDeadline, rightOfReply) };
}

export async function getPublicClaim(id: string) {
  const c = await prisma.claim.findFirst({ where: { id, state: { in: [...PUBLIC_STATES] } }, select: claimSelect });
  return c ? mapClaim(c) : null;
}

export async function getPublicIncident(id: string) {
  const i = await prisma.incident.findFirst({ where: { id, state: { in: [...PUBLIC_STATES] } }, select: incidentSelect });
  return i ? mapIncident(i) : null;
}

/** One query (plus its includes) for a whole page of a leader's public claims, newest first. */
export async function listPublicClaims(leaderId: string, take: number, skip: number) {
  const rows = await prisma.claim.findMany({
    where: { leaderId, state: { in: [...PUBLIC_STATES] } },
    select: claimSelect, orderBy: [{ dateMade: "desc" }, { id: "asc" }], take, skip,
  });
  return rows.map(mapClaim);
}

export async function listPublicIncidents(leaderId: string, take: number, skip: number) {
  const rows = await prisma.incident.findMany({
    where: { leaderId, state: { in: [...PUBLIC_STATES] } },
    select: incidentSelect, orderBy: [{ occurredAt: "desc" }, { id: "asc" }], take, skip,
  });
  return rows.map(mapIncident);
}
