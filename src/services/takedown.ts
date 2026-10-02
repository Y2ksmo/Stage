import { Prisma, type PublishState } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { handleItemStatusChange } from "./scoring";
import { VerificationError, type TargetType } from "./verification";

export type TakedownTarget = "DISPUTED" | "WITHDRAWN";

/**
 * Flip a Claim/Incident to DISPUTED or WITHDRAWN, log the decision, and rescore.
 * One serializable transaction: state change, audit row and score snapshot succeed or fail together.
 */
export async function applyTakedownAction(params: {
  actorId: string;
  targetType: TargetType;
  targetId: string;
  targetState: TakedownTarget;
  reason: string;
  /** Optional link to a public Takedown request, resolved by this action. */
  takedownRequestId?: string;
}) {
  const { actorId, targetType, targetId, targetState, reason, takedownRequestId } = params;

  return prisma.$transaction(
    async (tx) => {
      const actor = await tx.user.findUnique({ where: { id: actorId } });
      if (!actor || (actor.role !== "LEGAL" && actor.role !== "ADMIN")) {
        throw new VerificationError("FORBIDDEN", "Legal or admin role required.");
      }
      if (actor.suspendedUntil && actor.suspendedUntil > new Date()) {
        throw new VerificationError("FORBIDDEN", "Account suspended.");
      }

      const item =
        targetType === "CLAIM"
          ? await tx.claim.findUnique({ where: { id: targetId }, select: { leaderId: true, state: true } })
          : await tx.incident.findUnique({ where: { id: targetId }, select: { leaderId: true, state: true } });
      if (!item) throw new VerificationError("NOT_FOUND", `${targetType} not found.`);
      if (item.state === targetState) {
        throw new VerificationError("CONFLICT", `Item is already ${targetState}.`);
      }
      if (item.state === "WITHDRAWN") {
        throw new VerificationError("CONFLICT", "Item is WITHDRAWN and cannot be changed here.");
      }

      // Link the public request: it must exist, still be open, and concern this exact item.
      if (takedownRequestId) {
        const req = await tx.takedown.findUnique({ where: { id: takedownRequestId } });
        if (!req) throw new VerificationError("NOT_FOUND", "Takedown request not found.");
        if (req.status === "UPHELD" || req.status === "REJECTED") {
          throw new VerificationError("CONFLICT", "Takedown request has already been resolved.");
        }
        if (req.targetType !== targetType || req.targetId !== targetId) {
          throw new VerificationError("INVALID", "Takedown request does not refer to this item.");
        }
        await tx.takedown.update({
          where: { id: takedownRequestId },
          data: {
            // DISPUTED keeps the request open pending a final decision; WITHDRAWN upholds it.
            status: targetState === "WITHDRAWN" ? "UPHELD" : "UNDER_REVIEW",
            decidedBy: targetState === "WITHDRAWN" ? actorId : null,
            decisionNote: reason,
          },
        });
      }

      const previous: PublishState = item.state;
      if (targetType === "CLAIM") await tx.claim.update({ where: { id: targetId }, data: { state: targetState } });
      else await tx.incident.update({ where: { id: targetId }, data: { state: targetState } });

      await tx.moderationAction.create({
        data: {
          actorId,
          action: `TAKEDOWN_${targetState}`,
          targetType,
          targetId,
          reason: `${reason} (was ${previous}${takedownRequestId ? `; request ${takedownRequestId}` : ""})`,
        },
      });

      await handleItemStatusChange(tx, item.leaderId, previous, targetState);
      return { previousState: previous, state: targetState as PublishState };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
