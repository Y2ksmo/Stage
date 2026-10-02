import type { MissingRequirement, VerificationResult } from "./verification";

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const missingNl = (m: MissingRequirement): string => {
  switch (m.code) {
    case "SOURCES": return `${m.count} extra onafhankelijke, gearchiveerde ${plural(m.count, "bron", "bronnen")}`;
    case "STRONG_SOURCE": return "minstens één primaire bron of betrouwbaar medium";
    case "CONFIRMS": return `${m.count} extra bevestigende ${plural(m.count, "stem", "stemmen")}`;
    case "SPECIFICITY": return "een specifiekere voorspelling (specificiteit ≥ 0,6) voor de uitkomst 'niet uitgekomen' of 'aangepast'";
    case "TARGET_DATE": return m.issue.kind === "MISSING" ? "een streefdatum bij de voorspelling (vereist voor de uitkomst 'niet uitgekomen')" : `afloop van de streefdatum (${m.issue.date.toLocaleDateString("nl-NL", { dateStyle: "long", timeZone: "UTC" })})`;
    case "REPLY_NOT_OFFERED": return "wederhoor aanbieden en afronden";
    case "REPLY_WINDOW_OPEN": return "afloop of afronding van de wederhoortermijn";
  }
};

/**
 * Dutch, human-readable status for reviewers. Rendered from the SAME structured result the verification
 * engine uses to decide, so the text can never disagree with the actual rules.
 */
export function summarizeVerificationNl(r: Pick<VerificationResult, "state" | "missing" | "escalated" | "ignoredEvidence">): string {
  switch (r.state) {
    case "VERIFIED": return "Geverifieerd en openbaar.";
    case "DISPUTED": return "Betwist: tijdelijk uit de score gehaald; een juridische beoordeling loopt.";
    case "REJECTED": return "Afgewezen door de reviewers.";
    case "WITHDRAWN": return "Ingetrokken.";
    case "DRAFT": return "Concept: nog niet ingediend voor beoordeling.";
  }

  if (r.escalated) return "Tegenstrijdige stemmen: voorgelegd aan een redacteur voor een besluit.";

  const parts: string[] = [];
  parts.push(r.missing.length === 0 ? "Voldoet aan alle eisen; wordt automatisch geverifieerd." : `Nog nodig: ${r.missing.map(missingNl).join("; ")}.`);

  const { unarchived, unsupported } = r.ignoredEvidence;
  if (unarchived > 0) parts.push(`${unarchived} ${plural(unarchived, "bron is", "bronnen zijn")} niet gearchiveerd en ${plural(unarchived, "telt", "tellen")} niet mee.`);
  if (unsupported > 0) parts.push(`${unsupported} ${plural(unsupported, "bron", "bronnen")} van sociale media of een screenshot ${plural(unsupported, "telt", "tellen")} niet mee.`);
  return parts.join(" ");
}
