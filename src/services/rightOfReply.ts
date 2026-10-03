import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { NotificationService } from "./notification";
import { VerificationError, VerificationService, type TargetType } from "./verification";

import { REPLY_WINDOW_DAYS } from "./constants";
export { REPLY_WINDOW_DAYS };
const ALLOWED_ROLES = ["ADMIN", "LEGAL", "EDITOR"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

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
      // One-time secret for the subject. Only its hash is stored; the plaintext goes to the notice.
      const replyToken = randomBytes(32).toString("base64url");
      await tx.rightOfReply.create({
        data: { ...ref, sentAt: now, tokenHash: hashToken(replyToken), recipientEmail: recipient },
      });

      await tx.moderationAction.create({
        data: {
          actorId: userId,
          action: "RIGHT_OF_REPLY_OFFERED",
          targetType: itemType,
          targetId: itemId,
          reason: `Wederhoor van ${REPLY_WINDOW_DAYS} dagen gestart (verloopt ${deadline.toISOString()}). Ontvanger: ${recipient}`,
        },
      });

      return { itemType, itemId, leaderId: item.leaderId, replyStatus: "OFFERED" as const, replyDeadline: deadline, recipient, replyToken };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

const MAX_REPLY_CHARS = 10_000;
const MAX_URLS = 10;

export interface RecordReplyParams {
  /** One-time secret from the reply notice. It identifies the item and proves the caller is the recipient. */
  token: string;
  action: "ACCEPT" | "DECLINE"; // ACCEPT = submit a response, DECLINE = explicitly decline to respond
  replyText?: string;
  evidenceUrls?: string[];
}

function cleanUrls(urls: string[] | undefined): string[] {
  const out = (urls ?? []).map((u) => {
    let p: URL;
    try {
      p = new URL(u);
    } catch {
      throw new VerificationError("INVALID", "Ongeldige URL in evidenceUrls.");
    }
    if (p.protocol !== "http:" && p.protocol !== "https:") throw new VerificationError("INVALID", "Alleen http(s)-links zijn toegestaan.");
    return p.toString();
  });
  if (out.length > MAX_URLS) throw new VerificationError("INVALID", `Maximaal ${MAX_URLS} links.`);
  return out;
}

/**
 * The subject (or their representative) answers the right-of-reply notice. Unauthenticated by design,
 * authorised by the one-time token. The reply is published beside the item; it is NOT verification
 * evidence and never changes the score. Answering (or declining) closes the window, which may be the
 * last missing requirement, so the item is re-evaluated afterwards.
 * The RightOfReply row is the audit record: ModerationAction needs a staff actor, and the subject is not one.
 */
export async function recordSubjectReply(params: RecordReplyParams) {
  const { token, action } = params;
  if (typeof token !== "string" || token.length < 20) throw new VerificationError("NOT_FOUND", "Ongeldige of onbekende link.");
  if (action !== "ACCEPT" && action !== "DECLINE") throw new VerificationError("INVALID", "action moet ACCEPT of DECLINE zijn.");
  const replyText = params.replyText?.trim() || null;
  if (action === "ACCEPT" && !replyText) throw new VerificationError("INVALID", "Een reactie (replyText) is verplicht bij ACCEPT.");
  if (replyText && replyText.length > MAX_REPLY_CHARS) throw new VerificationError("INVALID", `Reactie mag maximaal ${MAX_REPLY_CHARS} tekens zijn.`);
  const evidenceUrls = cleanUrls(params.evidenceUrls);

  return prisma.$transaction(
    async (tx) => {
      const row = await tx.rightOfReply.findUnique({ where: { tokenHash: hashToken(token) } });
      // Same response for unknown tokens: don't reveal which links exist.
      if (!row || (!row.claimId && !row.incidentId)) throw new VerificationError("NOT_FOUND", "Ongeldige of onbekende link.");

      const itemType: TargetType = row.claimId ? "CLAIM" : "INCIDENT";
      const itemId = (row.claimId ?? row.incidentId) as string;
      const now = new Date();
      const target = action === "ACCEPT" ? ("RECEIVED" as const) : ("DECLINED" as const);

      // Conditional update: only while still OFFERED and before the deadline (also races safely with the expiry job).
      const where = { id: itemId, replyStatus: "OFFERED" as const, replyDeadline: { gt: now } };
      const upd =
        itemType === "CLAIM"
          ? await tx.claim.updateMany({ where, data: { replyStatus: target } })
          : await tx.incident.updateMany({ where, data: { replyStatus: target } });
      if (upd.count === 0) {
        throw new VerificationError("CONFLICT", "De wederhoor is al afgerond of de termijn is verstreken.");
      }

      await tx.rightOfReply.update({
        where: { id: row.id },
        data: {
          responseText: replyText,
          respondedAt: now,
          evidenceUrls,
          // Never public until an editor approves it (see reviewSubjectReply).
          publishedWithItem: false,
          reviewStatus: action === "ACCEPT" ? "PENDING" : null,
        },
      });

      const verification = await VerificationService.evaluateAndSetState(itemType, itemId, tx);
      return { itemType, itemId, replyStatus: target, itemState: verification.state };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/**
 * Open the window, then email the notice. The email goes out only after the window is committed
 * (so the link is valid), and if sending fails the window is rolled back: a window nobody was told about
 * must never run down and let the item verify.
 */
export async function startReplyWindowAndNotify(params: TriggerReplyWindowParams) {
  const { itemType, itemId, userId } = params;
  const started = await triggerRightOfReply(params);

  try {
    const [leader, item] = await Promise.all([
      prisma.leader.findUniqueOrThrow({ where: { id: started.leaderId }, select: { displayName: true } }),
      itemType === "CLAIM"
        ? prisma.claim.findUniqueOrThrow({ where: { id: itemId }, select: { summary: true, statementText: true } })
        : prisma.incident.findUniqueOrThrow({ where: { id: itemId }, select: { title: true } }),
    ]);
    const itemTitle =
      "title" in item ? item.title : (item.summary ?? item.statementText).slice(0, 140);
    await NotificationService.sendRightOfReplyNotice({
      recipientEmail: started.recipient,
      leaderName: leader.displayName,
      itemTitle,
      rawToken: started.replyToken,
      deadline: started.replyDeadline,
    });
  } catch (error) {
    await prisma.$transaction(async (tx) => {
      const data = { replyStatus: "NOT_OFFERED" as const, replyDeadline: null };
      if (itemType === "CLAIM") await tx.claim.updateMany({ where: { id: itemId, replyStatus: "OFFERED" }, data });
      else await tx.incident.updateMany({ where: { id: itemId, replyStatus: "OFFERED" }, data });
      await tx.rightOfReply.deleteMany({
        where: { ...(itemType === "CLAIM" ? { claimId: itemId } : { incidentId: itemId }), respondedAt: null },
      });
      await tx.moderationAction.create({
        data: {
          actorId: userId,
          action: "RIGHT_OF_REPLY_NOTICE_FAILED",
          targetType: itemType,
          targetId: itemId,
          reason: "Notice email could not be sent; reply window rolled back.",
        },
      });
    });
    if (error instanceof VerificationError) throw error;
    console.error("right-of-reply notice failed", error);
    throw new VerificationError("UPSTREAM", "Kennisgeving kon niet worden verzonden; wederhoor is niet gestart.");
  }

  // The reply token is deliberately NOT returned: it exists only in the email.
  return {
    itemType,
    itemId,
    leaderId: started.leaderId,
    replyStatus: started.replyStatus,
    replyDeadline: started.replyDeadline,
    recipient: started.recipient,
  };
}

export type ReplyWindowView =
  | { state: "OPEN"; leaderName: string; itemTitle: string; deadline: Date }
  | { state: "CLOSED"; leaderName: string }
  | { state: "EXPIRED"; leaderName: string };

/** Read-only lookup for the reply page. Returns null for unknown tokens (never reveals which exist). */
export async function describeReplyWindow(token: string): Promise<ReplyWindowView | null> {
  if (typeof token !== "string" || token.length < 20) return null;
  const row = await prisma.rightOfReply.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || (!row.claimId && !row.incidentId)) return null;

  const item = row.claimId
    ? await prisma.claim.findUnique({
        where: { id: row.claimId },
        select: { replyStatus: true, replyDeadline: true, summary: true, statementText: true, leader: { select: { displayName: true } } },
      })
    : await prisma.incident.findUnique({
        where: { id: row.incidentId as string },
        select: { replyStatus: true, replyDeadline: true, title: true, leader: { select: { displayName: true } } },
      });
  if (!item) return null;

  const leaderName = item.leader.displayName;
  if (item.replyStatus !== "OFFERED") {
    return item.replyStatus === "EXPIRED" ? { state: "EXPIRED", leaderName } : { state: "CLOSED", leaderName };
  }
  if (!item.replyDeadline || item.replyDeadline <= new Date()) return { state: "EXPIRED", leaderName };
  const itemTitle = "title" in item ? item.title : (item.summary ?? item.statementText).slice(0, 140);
  return { state: "OPEN", leaderName, itemTitle, deadline: item.replyDeadline };
}

const REVIEW_ROLES = ["EDITOR", "LEGAL", "ADMIN"] as const;

async function requireReviewer(tx: Prisma.TransactionClient, actorId: string) {
  const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, suspendedUntil: true } });
  if (!actor || (actor.suspendedUntil && actor.suspendedUntil > new Date())) {
    throw new VerificationError("FORBIDDEN", "Niet geautoriseerd of account geschorst.");
  }
  if (!(REVIEW_ROLES as readonly string[]).includes(actor.role)) {
    throw new VerificationError("FORBIDDEN", "Onvoldoende rechten om wederhoor-reacties te beoordelen.");
  }
}

/** Replies waiting for editorial review, oldest first. */
export async function listPendingReplies(actorId: string, limit = 100) {
  return prisma.$transaction(async (tx) => {
    await requireReviewer(tx, actorId);
    const rows = await tx.rightOfReply.findMany({
      where: { reviewStatus: "PENDING" },
      orderBy: { respondedAt: "asc" },
      take: Math.min(500, Math.max(1, Math.floor(limit))),
      select: {
        id: true, claimId: true, incidentId: true, responseText: true, evidenceUrls: true, respondedAt: true,
        claim: { select: { statementText: true, leader: { select: { displayName: true } } } },
        incident: { select: { title: true, leader: { select: { displayName: true } } } },
      },
    });
    return rows.map((r) => ({
      replyId: r.id,
      itemType: (r.claimId ? "CLAIM" : "INCIDENT") as TargetType,
      itemId: (r.claimId ?? r.incidentId) as string,
      leaderName: (r.claim ?? r.incident)?.leader.displayName ?? null,
      itemTitle: r.incident?.title ?? r.claim?.statementText.slice(0, 140) ?? null,
      responseText: r.responseText,
      evidenceUrls: r.evidenceUrls,
      respondedAt: r.respondedAt,
    }));
  });
}

/**
 * Editorial decision on a subject's reply. APPROVED publishes it beside the item; REJECTED withholds it
 * (the text is kept for the record) and requires a reason. A decision can be revised later, e.g. an approved
 * reply found to defame a third party can be switched to REJECTED. The decision is audited in ModerationAction.
 */
export async function reviewSubjectReply(params: {
  actorId: string;
  replyId: string;
  decision: "APPROVED" | "REJECTED";
  notes?: string;
}) {
  const { actorId, replyId, decision } = params;
  const notes = params.notes?.trim() || null;
  if (decision !== "APPROVED" && decision !== "REJECTED") throw new VerificationError("INVALID", "decision moet APPROVED of REJECTED zijn.");
  if (decision === "REJECTED" && !notes) throw new VerificationError("INVALID", "Een reden (notes) is verplicht bij afwijzen.");

  return prisma.$transaction(
    async (tx) => {
      await requireReviewer(tx, actorId);
      const row = await tx.rightOfReply.findUnique({
        where: { id: replyId },
        select: { reviewStatus: true, claimId: true, incidentId: true },
      });
      if (!row) throw new VerificationError("NOT_FOUND", "Reactie niet gevonden.");
      if (!row.reviewStatus) throw new VerificationError("CONFLICT", "Er is geen ingediende reactie om te beoordelen.");
      if (row.reviewStatus === decision) throw new VerificationError("CONFLICT", `Reactie is al ${decision}.`);

      const upd = await tx.rightOfReply.updateMany({
        where: { id: replyId, reviewStatus: row.reviewStatus },
        data: {
          reviewStatus: decision,
          reviewedAt: new Date(),
          reviewedById: actorId,
          reviewNotes: notes,
          publishedWithItem: decision === "APPROVED",
        },
      });
      if (upd.count === 0) throw new VerificationError("CONFLICT", "Reactie is gewijzigd; probeer opnieuw.");

      await tx.moderationAction.create({
        data: {
          actorId,
          action: `RIGHT_OF_REPLY_REVIEW_${decision}`,
          targetType: row.claimId ? "CLAIM" : "INCIDENT",
          targetId: (row.claimId ?? row.incidentId) as string,
          reason: `Reply ${replyId} ${decision}${notes ? `: ${notes}` : ""}`,
        },
      });
      return { replyId, reviewStatus: decision, published: decision === "APPROVED" };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
