import { safeHref } from "../lib/safeUrl";
import type { PublicResponse } from "../services/publicItems";

const fmt = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString("nl-NL", { dateStyle: "long", timeZone: "UTC" }) : "";

/** Neutral presentation of the subject's right of reply. Silence is never framed as guilt. */
export function RightOfReplyBlock({ data }: { data: PublicResponse }) {
  switch (data.status) {
    case "RESPONDED": {
      // Only http(s) links are shown; anything else is dropped rather than rendered.
      const links = data.evidenceUrls.flatMap((u) => {
        const href = safeHref(u);
        return href ? [{ href, label: u }] : [];
      });
      return (
        <div className="reply reply-responded">
          <p className="reply-label">Reactie van de betrokkene{data.respondedAt ? ` (${fmt(data.respondedAt)})` : ""}</p>
          <blockquote>{data.responseText}</blockquote>
          {links.length > 0 && (
            <ul className="reply-links">
              {links.map((l) => (
                <li key={l.href}><a href={l.href} rel="noopener noreferrer nofollow" target="_blank">{l.label}</a></li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    case "AWAITING_RESPONSE":
      return <p className="reply muted">Wederhoor aangeboden{data.deadline ? `; de termijn loopt tot ${fmt(data.deadline)}` : ""}.</p>;
    case "NO_RESPONSE":
      return <p className="reply muted">Binnen de termijn is geen reactie ontvangen. Dit wordt neutraal vermeld en heeft geen invloed op de beoordeling.</p>;
    case "DECLINED":
      return <p className="reply muted">De betrokkene heeft aangegeven niet te reageren.</p>;
    case "RESPONDED_UNDER_REVIEW":
      return <p className="reply muted">Er is een reactie ontvangen; deze wordt redactioneel gecontroleerd vóór publicatie.</p>;
    case "RESPONDED_NOT_PUBLISHED":
      return <p className="reply muted">Er is een reactie ontvangen, die na redactionele controle niet is gepubliceerd.</p>;
    default:
      return <p className="reply muted">Wederhoor is nog niet aangeboden.</p>;
  }
}
