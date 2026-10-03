import { prisma } from "../lib/prisma";
import { VerificationError } from "./verification";

export type PublicTakedownTarget = "CLAIM" | "INCIDENT" | "LEADER";

export interface SubmitTakedownParams {
  requesterEmail: string;
  requesterName?: string;
  targetType: PublicTakedownTarget;
  targetId: string;
  grounds: string;
  evidenceUrls?: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PER_EMAIL_PER_DAY = 5;
const MAX_GROUNDS = 5000;
const MAX_URLS = 10;

function cleanUrls(urls: string[] | undefined): string[] {
  const out: string[] = [];
  for (const u of urls ?? []) {
    let parsed: URL;
    try {
      parsed = new URL(u);
    } catch {
      throw new VerificationError("INVALID", `Ongeldige URL: ${u.slice(0, 80)}`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new VerificationError("INVALID", "Alleen http(s)-links zijn toegestaan.");
    }
    out.push(parsed.toString());
  }
  if (out.length > MAX_URLS) throw new VerificationError("INVALID", `Maximaal ${MAX_URLS} links.`);
  return out;
}

/**
 * Public intake. Creates an OPEN request for LEGAL to review.
 * It deliberately does NOT change the item's state: letting anonymous submitters hide content
 * would turn the form into a takedown weapon. Moderators flip items to DISPUTED when warranted.
 */
export async function submitPublicTakedown(params: SubmitTakedownParams) {
  const email = params.requesterEmail?.trim().toLowerCase();
  const grounds = params.grounds?.trim();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    throw new VerificationError("INVALID", "Een geldig e-mailadres is verplicht.");
  }
  if (!grounds) throw new VerificationError("INVALID", "Een onderbouwing/reden voor het takedown-verzoek is verplicht.");
  if (grounds.length > MAX_GROUNDS) throw new VerificationError("INVALID", `Onderbouwing mag maximaal ${MAX_GROUNDS} tekens zijn.`);
  if (!["CLAIM", "INCIDENT", "LEADER"].includes(params.targetType)) {
    throw new VerificationError("INVALID", "Ongeldig targetType. Gebruik CLAIM, INCIDENT of LEADER.");
  }
  const evidenceUrls = cleanUrls(params.evidenceUrls);

  // Resolve target and its leader (also tells us which leader the request concerns).
  let leaderId: string;
  if (params.targetType === "CLAIM") {
    const c = await prisma.claim.findUnique({ where: { id: params.targetId }, select: { leaderId: true } });
    if (!c) throw new VerificationError("NOT_FOUND", "Claim niet gevonden.");
    leaderId = c.leaderId;
  } else if (params.targetType === "INCIDENT") {
    const i = await prisma.incident.findUnique({ where: { id: params.targetId }, select: { leaderId: true } });
    if (!i) throw new VerificationError("NOT_FOUND", "Incident niet gevonden.");
    leaderId = i.leaderId;
  } else {
    const l = await prisma.leader.findUnique({ where: { id: params.targetId }, select: { id: true } });
    if (!l) throw new VerificationError("NOT_FOUND", "Leider niet gevonden.");
    leaderId = l.id;
  }
  // Takedown.targetType uses PROFILE for a whole leader profile.
  const targetType = params.targetType === "LEADER" ? "PROFILE" : params.targetType;

  const [recent, duplicate] = await Promise.all([
    prisma.takedown.count({
      where: { requesterEmail: email, createdAt: { gt: new Date(Date.now() - 24 * 3600 * 1000) } },
    }),
    prisma.takedown.findFirst({
      where: { requesterEmail: email, targetType, targetId: params.targetId, status: { in: ["OPEN", "UNDER_REVIEW"] } },
      select: { id: true },
    }),
  ]);
  if (recent >= MAX_PER_EMAIL_PER_DAY) {
    throw new VerificationError("RATE_LIMITED", "Te veel verzoeken in de afgelopen 24 uur. Probeer het later opnieuw.");
  }
  if (duplicate) throw new VerificationError("CONFLICT", "Er is al een open verzoek van dit e-mailadres voor dit item.");

  return prisma.takedown.create({
    data: {
      leaderId,
      requesterEmail: email,
      requesterName: params.requesterName?.trim().slice(0, 200) || null,
      targetType,
      targetId: params.targetId,
      grounds,
      evidenceUrls,
      status: "OPEN",
    },
    select: { id: true, status: true, createdAt: true },
  });
}
