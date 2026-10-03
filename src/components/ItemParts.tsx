import Link from "next/link";
import { safeHref } from "../lib/safeUrl";

export const DISCLAIMER =
  "Samengesteld uit openbare, geciteerde bronnen volgens een gepubliceerde methodologie. Beschuldigingen zijn geen vastgestelde feiten. Deze pagina is geen oordeel over enig geloof of enige traditie.";

export const OUTCOMES: Record<string, string> = {
  PENDING: "Nog open", FULFILLED: "Uitgekomen", FAILED: "Niet uitgekomen", RETRACTED: "Ingetrokken", MODIFIED: "Achteraf aangepast",
};
export const CATEGORIES: Record<string, string> = {
  FINANCIAL_OPACITY: "Financiële ondoorzichtigheid", COERCED_GIVING: "Gedwongen geven", LUXURY_FUNDING: "Luxe levensstijl via giften",
  SCANDAL_MORAL: "Moreel schandaal", EMOTIONAL_MANIPULATION: "Emotionele manipulatie", ISOLATION_TACTICS: "Isolatietactieken",
  AUTHORITARIAN_CONTROL: "Autoritaire controle", DOCTRINAL_DEVIATION: "Afwijking van eigen leer of normen", ABUSE_ALLEGATION: "Misbruik",
  LEGAL_FINDING: "Juridische bevinding", BITE_BEHAVIOR: "Gedragscontrole", BITE_INFORMATION: "Informatiecontrole",
  BITE_THOUGHT: "Gedachtecontrole", BITE_EMOTIONAL: "Emotionele controle",
};
export const DIMENSIONS: Record<string, string> = {
  PREDICTION: "Voorspellingen", FINANCIAL: "Financiële transparantie", BEHAVIORAL: "Gedrag & integriteit",
  DOCTRINAL: "Eigen leer & normen", CULTIC: "Controle-indicatoren (BITE)",
};
const TIERS: Record<string, string> = { PRIMARY: "primaire bron", TIER1_MEDIA: "betrouwbaar medium", SECONDARY: "secundaire bron", SOCIAL: "sociale media" };

export const fmtDate = (d: Date | null | undefined) => (d ? d.toLocaleDateString("nl-NL", { dateStyle: "long", timeZone: "UTC" }) : "");

type EvidenceRow = { url: string | null; archiveUrl: string | null; publisherKey: string; excerpt: string | null; tier?: string };

/** Sources behind an item. Only http(s) links are rendered as links. */
export function Evidence({ list, open = false }: { list: EvidenceRow[]; open?: boolean }) {
  if (list.length === 0) return null;
  return (
    <details className="evidence" open={open}>
      <summary>Bronnen ({list.length})</summary>
      <ul>
        {list.map((e, i) => {
          const href = safeHref(e.url);
          const arc = safeHref(e.archiveUrl);
          return (
            <li key={`${e.publisherKey}-${i}`}>
              {href ? <a href={href} rel="noopener noreferrer nofollow" target="_blank">{e.publisherKey}</a> : e.publisherKey}
              {e.tier && <span className="muted small"> ({TIERS[e.tier] ?? e.tier})</span>}
              {arc && <> • <a href={arc} rel="noopener noreferrer nofollow" target="_blank">archief</a></>}
              {e.excerpt && <span className="muted small"> — “{e.excerpt}”</span>}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

/** Link to the public takedown/rectification request form. */
export function TakedownLink({ targetType, targetId }: { targetType: "CLAIM" | "INCIDENT" | "LEADER"; targetId: string }) {
  return (
    <p className="muted small takedown-cta">
      Is deze informatie onjuist of schendt zij uw rechten?{" "}
      <Link href={`/takedowns/new?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`}>Dien een verzoek tot verwijdering of rectificatie in</Link>
    </p>
  );
}
