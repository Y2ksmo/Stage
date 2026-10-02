import type { Metadata } from "next";
import { LogoutButton, StaffLogin } from "../../../components/StaffSession";
import { StaffNav } from "../../../components/StaffNav";
import { TakedownAction } from "../../../components/TakedownAction";
import { currentSession } from "../../../lib/staffSession";
import { safeHref } from "../../../lib/safeUrl";
import { listTakedownRequests } from "../../../services/takedownQueue";
import { VerificationError } from "../../../services/verification";

export const metadata: Metadata = { title: "Takedown-verzoeken", robots: { index: false, follow: false } };

const LIMIT = 50;
const fmt = (d: Date) => d.toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }) + " (UTC)";
const TARGETS: Record<string, string> = { CLAIM: "Claim", INCIDENT: "Incident", PROFILE: "Profiel", REVIEW: "Review" };
const STATES: Record<string, string> = { VERIFIED: "geverifieerd", DISPUTED: "betwist", IN_REVIEW: "in beoordeling", DRAFT: "concept", REJECTED: "afgewezen", WITHDRAWN: "ingetrokken" };

export default async function TakedownQueuePage() {
  const session = await currentSession();
  if (!session) {
    return (
      <main className="page">
        <h1>Redactie: inloggen</h1>
        <p className="muted">Plak uw sessietoken om de takedown-verzoeken te openen.</p>
        <StaffLogin />
      </main>
    );
  }

  let queue;
  try {
    queue = await listTakedownRequests(session.userId, LIMIT);
  } catch (e) {
    if (e instanceof VerificationError && e.code === "FORBIDDEN") {
      return (
        <main className="page">
          <div className="card notice-bad" role="alert">
            <h1>Geen toegang</h1>
            <p>Takedown-verzoeken bevatten contactgegevens van aanvragers; de rol juridisch of beheerder is vereist.</p>
          </div>
          <LogoutButton />
        </main>
      );
    }
    throw e;
  }

  return (
    <main className="page page-wide">
      <div className="profile-head"><h1>Takedown-verzoeken</h1><LogoutButton /></div>
      <StaffNav />
      <p className="muted small">
        Een aangeleverd verzoek verbergt niets automatisch. U besluit: tijdelijk betwisten (het item verdwijnt uit de score maar blijft zichtbaar met een banner), definitief verwijderen, of het verzoek afwijzen. Elk besluit wordt met uw onderbouwing vastgelegd.
      </p>
      {queue.length >= LIMIT && <p className="card notice-note small" role="status">Alleen de {LIMIT} oudste verzoeken worden getoond.</p>}

      {queue.length === 0 ? (
        <p className="muted"><em>Geen openstaande verzoeken.</em></p>
      ) : (
        queue.map((q) => (
          <article key={q.requestId} className="card item">
            <div className="badges">
              <span className="badge">{TARGETS[q.targetType] ?? q.targetType}</span>
              {q.leaderName && <span className="badge">{q.leaderName}</span>}
              <span className="badge">{q.status === "OPEN" ? "Open" : "In behandeling (item betwist)"}</span>
              {q.itemState && <span className="badge">Item: {STATES[q.itemState] ?? q.itemState}</span>}
            </div>
            {q.itemTitle && <blockquote className="statement">{q.itemTitle}</blockquote>}
            <p className="muted small">
              Ingediend {fmt(q.createdAt)} door {q.requesterName ? `${q.requesterName} ` : ""}&lt;{q.requesterEmail}&gt;. Het e-mailadres is niet geverifieerd.
            </p>
            <p><strong>Gronden van de aanvrager:</strong></p>
            <blockquote>{q.grounds}</blockquote>
            {q.evidenceUrls.length > 0 && (
              <ul className="reply-links">
                {q.evidenceUrls.map((u) => {
                  const href = safeHref(u);
                  return <li key={u}>{href ? <a href={href} rel="noopener noreferrer nofollow" target="_blank">{u}</a> : <span className="muted">{u} (geen geldige link)</span>}</li>;
                })}
              </ul>
            )}
            <TakedownAction requestId={q.requestId} requestStatus={q.status} targetType={q.targetType} targetId={q.targetId} actionable={q.actionable} />
          </article>
        ))
      )}
    </main>
  );
}
