import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { VerificationError, VerificationService, evaluate, checkPredictionTargetDate, MIN_SPECIFICITY, type TargetType, type VerificationResult } from "./verification";

const RESOLVER_ROLES = ["EDITOR", "ADMIN"] as const;
const MIN_RATIONALE = 15;

/**
 * An editor decides an item whose reviewer votes conflict (2+ confirm AND 2+ reject).
 *
 *  - REJECT  : the item is rejected.
 *  - CONFIRM : the editor's decision stands in for the VOTE requirement ONLY. Sources, archiving, reply window,
 *              specificity and target date must all still be satisfied; if something is missing the item stays in
 *              review and verifies automatically once it is met. An editor can never publish an item that lacks
 *              evidence.
 *
 * Guards: editor/admin role, not the item's own submitter, a stated absence of conflict of interest, a rationale of
 * at least 15 characters, and the item must really be in the conflict state (one decision per conflict).
 * The decision is stored on the item and audited in ModerationAction (vote counts only, never who voted how).
 */
export async function resolveConflictingVotes(params: {
  editorId: string;
  itemType: TargetType;
  itemId: string;
  decision: "CONFIRM" | "REJECT";
  rationale: string;
  noConflict: boolean;
}): Promise<VerificationResult> {
  const { editorId, itemType, itemId, decision } = params;
  const rationale = params.rationale?.trim() ?? "";
  if (decision !== "CONFIRM" && decision !== "REJECT") throw new VerificationError("INVALID", "decision moet CONFIRM of REJECT zijn.");
  if (rationale.length < MIN_RATIONALE) throw new VerificationError("INVALID", `Een redactionele onderbouwing van minstens ${MIN_RATIONALE} tekens is verplicht.`);
  if (params.noConflict !== true) throw new VerificationError("INVALID", "Bevestig dat u geen belangenconflict heeft met dit item.");

  return prisma.$transaction(
    async (tx) => {
      const editor = await tx.user.findUnique({ where: { id: editorId }, select: { role: true, suspendedUntil: true } });
      if (!editor || (editor.suspendedUntil && editor.suspendedUntil > new Date())) throw new VerificationError("FORBIDDEN", "Account geschorst of onbekend.");
      if (!(RESOLVER_ROLES as readonly string[]).includes(editor.role)) throw new VerificationError("FORBIDDEN", "Alleen een redacteur of beheerder kan tegenstrijdige stemmen beslechten.");

      const now = new Date();
      const common = { evidence: true, votes: true } as const;
      const item =
        itemType === "CLAIM"
          ? await tx.claim.findUnique({ where: { id: itemId }, include: common })
          : await tx.incident.findUnique({ where: { id: itemId }, include: common });
      if (!item) throw new VerificationError("NOT_FOUND", `${itemType} niet gevonden.`);
      if (item.submitterId === editorId) throw new VerificationError("FORBIDDEN", "U kunt niet beslissen over uw eigen inzending.");
      if (item.state !== "IN_REVIEW") throw new VerificationError("CONFLICT", `Item is ${item.state}; alleen items in beoordeling kunnen worden beslist.`);
      if (item.editorResolution) throw new VerificationError("CONFLICT", "Over dit item is al een redactioneel besluit genomen.");

      // It must genuinely be in the conflict state right now (computed exactly as the engine does).
      const claim = itemType === "CLAIM" ? (item as typeof item & { outcome: string; specificity: number; targetDate: Date | null }) : null;
      const before = evaluate({
        state: item.state,
        evidence: item.evidence,
        votes: item.votes,
        replyStatus: item.replyStatus,
        replyDeadline: item.replyDeadline,
        replyRequired: itemType === "INCIDENT",
        specificityOk: !claim || !(claim.outcome === "FAILED" || claim.outcome === "MODIFIED") || claim.specificity >= MIN_SPECIFICITY,
        targetDateIssue: claim ? checkPredictionTargetDate(claim.outcome, claim.targetDate, now) : undefined,
        now,
      });
      if (!before.escalated) throw new VerificationError("CONFLICT", "Er is geen sprake van tegenstrijdige stemmen bij dit item.");

      const data = { editorResolution: decision, resolvedAt: now, resolvedById: editorId, resolutionNote: rationale };
      if (itemType === "CLAIM") await tx.claim.update({ where: { id: itemId }, data });
      else await tx.incident.update({ where: { id: itemId }, data });

      // Re-run the normal rules with the decision applied: REJECT rejects; CONFIRM verifies only if all else is met.
      const result = await VerificationService.evaluateAndSetState(itemType, itemId, tx);

      await tx.moderationAction.create({
        data: {
          actorId: editorId,
          action: `CONFLICT_RESOLVED_${decision}`,
          targetType: itemType,
          targetId: itemId,
          reason: `${rationale} (stemmen: ${before.confirmVotes} bevestigd, ${before.rejectVotes} afgewezen; resultaat: ${result.state})`,
        },
      });
      return result;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
