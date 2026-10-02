import { prisma } from "../lib/prisma";
import { listPublicClaims, listPublicIncidents } from "./publicItems";
import { latestScore } from "./scoring";

const PUBLIC_STATES = ["VERIFIED", "DISPUTED"] as const;
const MAX_LIMIT = 100;

/**
 * Public leader profile: identity, score, statistics and a page of verified items.
 * Accepts either the id or the slug. Only fields on the allowlist below are ever selected.
 *
 * Statistics are plain counts computed over ALL public items (not just the returned page).
 * "Response" stats only consider items whose right-of-reply window has CLOSED (answered, declined or
 * expired). Items with no reply requested, or whose window is still open, are not counted as a
 * non-response, so a leader is never made to look evasive for something that never happened.
 */
export async function getPublicLeaderProfile(idOrSlug: string, opts: { limit?: number; offset?: number } = {}) {
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(opts.limit ?? 50)));
  const offset = Math.max(0, Math.floor(opts.offset ?? 0));

  const leader = await prisma.leader.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, slug: true, displayName: true, bio: true, status: true, tradition: true, country: true, createdAt: true },
  });
  if (!leader) return null;

  const where = { leaderId: leader.id, state: { in: [...PUBLIC_STATES] } };
  const [claims, incidents, outcomeGroups, claimReplyGroups, incidentReplyGroups, claimStateGroups, incidentStateGroups, snap] =
    await Promise.all([
      listPublicClaims(leader.id, limit, offset),
      listPublicIncidents(leader.id, limit, offset),
      prisma.claim.groupBy({ by: ["outcome"], where, _count: { _all: true } }),
      prisma.claim.groupBy({ by: ["replyStatus"], where, _count: { _all: true } }),
      prisma.incident.groupBy({ by: ["replyStatus"], where, _count: { _all: true } }),
      prisma.claim.groupBy({ by: ["state"], where, _count: { _all: true } }),
      prisma.incident.groupBy({ by: ["state"], where, _count: { _all: true } }),
      latestScore(prisma, leader.id),
    ]);

  const sum = <T extends { _count: { _all: number } }>(rows: T[], pick: (r: T) => boolean) =>
    rows.filter(pick).reduce((n, r) => n + r._count._all, 0);
  const totalClaims = sum(claimStateGroups, () => true);
  const totalIncidents = sum(incidentStateGroups, () => true);
  const disputed = sum(claimStateGroups, (r) => r.state === "DISPUTED") + sum(incidentStateGroups, (r) => r.state === "DISPUTED");

  const replyGroups = [...claimReplyGroups, ...incidentReplyGroups];
  const responded = sum(replyGroups, (r) => r.replyStatus === "RECEIVED");
  const declined = sum(replyGroups, (r) => r.replyStatus === "DECLINED");
  const noResponse = sum(replyGroups, (r) => r.replyStatus === "EXPIRED");
  const awaiting = sum(replyGroups, (r) => r.replyStatus === "OFFERED");
  const closedWindows = responded + declined + noResponse;

  const outcomes = Object.fromEntries(outcomeGroups.map((g) => [g.outcome, g._count._all]));

  return {
    leader,
    score: snap
      ? { riskScore: snap.riskScore, band: snap.band, confidence: snap.confidence, dimensions: snap.dimensions, methodologyVersion: snap.methodologyVersion, computedAt: snap.computedAt }
      : { riskScore: null, band: "INSUFFICIENT_DATA", confidence: 0, dimensions: [], methodologyVersion: null, computedAt: null },
    stats: {
      totalItems: totalClaims + totalIncidents,
      totalClaims,
      totalIncidents,
      disputedItems: disputed,
      claimOutcomes: outcomes, // counts per outcome: FULFILLED / FAILED / MODIFIED / RETRACTED / PENDING
      rightOfReply: {
        closedWindows, // answered + declined + expired
        responded,
        declined,
        noResponse,
        awaitingResponse: awaiting,
        responseRate: closedWindows > 0 ? Math.round((responded / closedWindows) * 100) : null, // null = nothing to measure yet
      },
    },
    items: { claims, incidents },
    page: { limit, offset, hasMoreClaims: offset + claims.length < totalClaims, hasMoreIncidents: offset + incidents.length < totalIncidents },
  };
}

/** Cheap lookup for page metadata (title/description) without loading the whole profile. */
export async function getPublicLeaderMeta(idOrSlug: string) {
  return prisma.leader.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { displayName: true, bio: true },
  });
}
