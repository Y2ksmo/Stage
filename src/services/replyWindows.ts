import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { VerificationService, type TargetType } from "./verification";

export interface ProcessReplyWindowsResult {
  processedClaims: number;
  processedIncidents: number;
  verified: number;
  errors: Array<{ itemType: TargetType; itemId: string; error: string }>;
}

const BATCH = 500;

/**
 * For every IN_REVIEW item whose right-of-reply window has passed without a response:
 * record replyStatus = EXPIRED (shown publicly as "no response received"; never affects the score),
 * then re-evaluate it, since an expired window may be the last missing verification requirement.
 * Each item runs in its own transaction so one failure never blocks the rest. Safe to re-run.
 */
export async function processExpiredReplyWindows(now = new Date()): Promise<ProcessReplyWindowsResult> {
  const where = { state: "IN_REVIEW" as const, replyStatus: "OFFERED" as const, replyDeadline: { lte: now } };
  const [claims, incidents] = await Promise.all([
    prisma.claim.findMany({ where, select: { id: true }, take: BATCH, orderBy: { replyDeadline: "asc" } }),
    prisma.incident.findMany({ where, select: { id: true }, take: BATCH, orderBy: { replyDeadline: "asc" } }),
  ]);

  const result: ProcessReplyWindowsResult = { processedClaims: 0, processedIncidents: 0, verified: 0, errors: [] };

  const run = async (itemType: TargetType, id: string) => {
    try {
      const r = await prisma.$transaction(
        async (tx) => {
          // Conditional update: skips if a reply arrived or another worker already handled it.
          const upd =
            itemType === "CLAIM"
              ? await tx.claim.updateMany({ where: { id, ...where }, data: { replyStatus: "EXPIRED" } })
              : await tx.incident.updateMany({ where: { id, ...where }, data: { replyStatus: "EXPIRED" } });
          if (upd.count === 0) return null;
          return VerificationService.evaluateAndSetState(itemType, id, tx);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      if (!r) return;
      if (itemType === "CLAIM") result.processedClaims++;
      else result.processedIncidents++;
      if (r.isVerified) result.verified++;
    } catch (error) {
      console.error(`Reply-window processing failed for ${itemType} ${id}`, error);
      result.errors.push({ itemType, itemId: id, error: error instanceof Error ? error.message : String(error) });
    }
  };

  for (const c of claims) await run("CLAIM", c.id);
  for (const i of incidents) await run("INCIDENT", i.id);
  return result;
}
