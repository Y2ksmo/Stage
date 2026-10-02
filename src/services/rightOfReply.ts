import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { VerificationError, type TargetType } from "./verification";

export const REPLY_WINDOW_DAYS = 14;
const ALLOWED_ROLES = ["ADMIN", "LEGAL", "EDITOR"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface TriggerReplyWindowParams {
  itemType: TargetType;
  itemId: string;
  userId: string;
  /** Falls back to the leader's verified replyContact when omitted. */
  recipientEmail?: string;
}

/**
 * Open the 14-day right-of-reply window on an IN_REVIEW item.
 * Requires a recipient: opening a window nobody was told about would let the item verify
 * after it "expires" without the subject ever having had a chance to respond.
 * NOTE: this records the offer; it does not send any email (no mail provider is wired in yet).
 */
export async function triggerRightOfReply(params: TriggerReplyWindowParams) {
  const { itemType, itemId, userId } = params;

  return prisma.$transaction(
    async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || (user.suspendedUntil && user.suspendedUntil > new Date())) {
        throw new VerificationError("FORBIDDEN", "Niet geautoriseerd of account geschorst.");
      }
      if (!(ALLOWED_ROLES as readonly string[]).includes(user.role)) {
        throw new VerificationError("FORBIDDEN", "Alleen ADMIN, LEGAL of EDITOR kan wederhoor starten.");
      }

      const item =
        itemType === "CLAIM"
          ? await tx.claim.findUnique({ where: { id: itemId }, select: { leaderId: true, state: true, replyStatus: true } })
          : await tx.incident.findUnique({ where: { id: itemId }, select: { leaderId: true, state: true, replyStatus: true } });
      if (!item) throw new VerificationError("NOT_FOUND", `${itemType} niet gevonden.`);
      if (item.state !== "IN_REVIEW") {
        throw new VerificationError("CONFLICT", `Wederhoor kan alleen voor items in IN_REVIEW (huidige status: ${item.state}).`);
      }
      if (item.replyStatus !== "NOT_OFFERED") {
        throw new VerificationError("CONFLICT", `Wederhoor is al gestart of afgerond (${item.replyStatus}).`);
      }

      const leader = await tx.leader.findUnique({ where: { id: item.leaderId }, select: { replyContact: true } });
      const recipient = (params.recipientEmail ?? leader?.replyContact ?? "").trim();
      if (!recipient || !EMAIL_RE.test(recipient)) {
        throw new VerificationError("INVALID", "Een geldig ontvangeradres is verplicht (geef recipientEmail op of stel replyContact in op de leider).");
      }

      const now = new Date();
      const deadline = new Date(now.getTime() + REPLY_WINDOW_DAYS * 24 * 3600 * 1000);
      const data = { replyStatus: "OFFERED" as const, replyDeadline: deadline };
      const ref = itemType === "CLAIM" ? { claimId: itemId } : { incidentId: itemId };

      // Conditional update guards against a concurrent start.
      const upd =
        itemType === "CLAIM"
          ? await tx.claim.updateMany({ where: { id: itemId, state: "IN_REVIEW", replyStatus: "NOT_OFFERED" }, data })
          : await tx.incident.updateMany({ where: { id: itemId, state: "IN_REVIEW", replyStatus: "NOT_OFFERED" }, data });
      if (upd.count === 0) throw new VerificationError("CONFLICT", "Item is gewijzigd; probeer opnieuw.");

      // The response (if any) will attach to this row later.
      await tx.rightOfReply.create({ data: { ...ref, sentAt: now } });

      await tx.moderationAction.create({
        data: {
          actorId: userId,
          action: "RIGHT_OF_REPLY_OFFERED",
          targetType: itemType,
          targetId: itemId,
          reason: `Wederhoor van ${REPLY_WINDOW_DAYS} dagen gestart (verloopt ${deadline.toISOString()}). Ontvanger: ${recipient}`,
        },
      });

      return { itemType, itemId, leaderId: item.leaderId, replyStatus: "OFFERED" as const, replyDeadline: deadline, recipient };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
