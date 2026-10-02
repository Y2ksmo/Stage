import { prisma } from "../lib/prisma";
import { VerificationError } from "./verification";

export interface TakedownQueueItem {
  requestId: string;
  status: "OPEN" | "UNDER_REVIEW";
  targetType: string; // CLAIM | INCIDENT | PROFILE | REVIEW
  targetId: string;
  leaderName: string | null;
  itemTitle: string | null;
  itemState: string | null;
  grounds: string;
  requesterEmail: string;
  requesterName: string | null;
  evidenceUrls: string[];
  createdAt: Date;
  /** Claims and incidents can be disputed/withdrawn/restored through the system; profile/review requests cannot yet. */
  actionable: boolean;
}

/** Open and under-review takedown requests, oldest first. LEGAL / ADMIN only (contains requester contact data). */
export async function listTakedownRequests(userId: string, limit = 50): Promise<TakedownQueueItem[]> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, suspendedUntil: true } });
  if (!user || (user.suspendedUntil && user.suspendedUntil > new Date())) throw new VerificationError("FORBIDDEN", "Account geschorst of onbekend.");
  if (user.role !== "LEGAL" && user.role !== "ADMIN") throw new VerificationError("FORBIDDEN", "Legal- of admin-rol vereist.");

  const rows = await prisma.takedown.findMany({
    where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true, status: true, targetType: true, targetId: true, grounds: true, requesterEmail: true,
      requesterName: true, evidenceUrls: true, createdAt: true, leader: { select: { displayName: true } },
    },
  });

  const claimIds = rows.filter((r) => r.targetType === "CLAIM").map((r) => r.targetId);
  const incidentIds = rows.filter((r) => r.targetType === "INCIDENT").map((r) => r.targetId);
  const [claims, incidents] = await Promise.all([
    prisma.claim.findMany({ where: { id: { in: claimIds } }, select: { id: true, statementText: true, state: true } }),
    prisma.incident.findMany({ where: { id: { in: incidentIds } }, select: { id: true, title: true, state: true } }),
  ]);
  const claimById = new Map(claims.map((c) => [c.id, c]));
  const incidentById = new Map(incidents.map((i) => [i.id, i]));

  return rows.map((r) => {
    const c = r.targetType === "CLAIM" ? claimById.get(r.targetId) : undefined;
    const i = r.targetType === "INCIDENT" ? incidentById.get(r.targetId) : undefined;
    return {
      requestId: r.id,
      status: r.status as "OPEN" | "UNDER_REVIEW",
      targetType: r.targetType,
      targetId: r.targetId,
      leaderName: r.leader?.displayName ?? null,
      itemTitle: c ? c.statementText.slice(0, 200) : (i?.title ?? null),
      itemState: c?.state ?? i?.state ?? null,
      grounds: r.grounds,
      requesterEmail: r.requesterEmail,
      requesterName: r.requesterName,
      evidenceUrls: r.evidenceUrls,
      createdAt: r.createdAt,
      actionable: (r.targetType === "CLAIM" && !!c) || (r.targetType === "INCIDENT" && !!i),
    };
  });
}
