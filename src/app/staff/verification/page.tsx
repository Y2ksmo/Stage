import type { Metadata } from "next";
import { LogoutButton, StaffLogin } from "../../../components/StaffSession";
import { StaffNav } from "../../../components/StaffNav";
import { ConflictResolution } from "../../../components/ConflictResolution";
import { VoteAction } from "../../../components/VoteAction";
import { currentSession } from "../../../lib/staffSession";
import { safeHref } from "../../../lib/safeUrl";
import { getStaffRole, listVerificationQueue } from "../../../services/verificationQueue";
import { VerificationError } from "../../../services/verification";

export const metadata: Metadata = { title: "Verificatie-wachtrij", robots: { index: false, follow: false } };

const QUEUE_LIMIT = 50;
const fmt = (d: Date) => d.toLocaleDateString("nl-NL", { dateStyle: "long", timeZone: "UTC" });
const TIERS: Record<string, string> = { PRIMARY: "primaire bron", TIER1_MEDIA: "betrouwbaar medium", SECONDARY: "secundaire bron", SOCIAL: "sociale media (telt niet mee)" };

export default async function VerificationQueuePage() {
  const session = await currentSession();
  if (!session) {
    return (
      <main className="page">
        <h1>Redactie: inloggen</h1>
        <p className="muted">Plak uw sessietoken om de verificatie-wachtrij te openen.</p>
        <StaffLogin />
      </main>
    );
  }

  let queue;
  let role: string | null = null;
  try {
    queue = await listVerificationQueue(session.userId, QUEUE_LIMIT);
    role = await getStaffRole(session.userId);
  } catch (e) {
    if (e instanceof VerificationError && e.code === "FORBIDDEN") {
      return (
        <main className="page">
          <div className="card notice-bad" role="alert">
            <h1>Geen toegang</h1>
            <p>Voor verificatie is de rol reviewer, redacteur of beheerder vereist.</p>
          </div>
          <LogoutButton />
        </main>
      );
    }
    throw e;
  }

  return (
    <main className="page page-wide">
      <div className="profile-head"><h1>Verificatie-wachtrij</h1><LogoutButton /></div>
      <StaffNav />
      <p className="muted small">
        Een item wordt pas geverifieerd met minstens 2 onafhankelijke, gearchiveerde bronnen (waarvan 1 primair of betrouwbaar medium), 2 bevestigende stemmen en afgeronde wederhoor.
        Uw eigen inzendingen staan hier niet. U ziet alleen aantallen stemmen, niet wie hoe stemde.
      </p>

      {queue.length >= QUEUE_LIMIT && (
        <p className="card notice-note small" role="status">
          Alleen de {QUEUE_LIMIT} langst wachtende items worden getoond. Zodra u items afhandelt verschijnen de volgende.
        </p>
      )}

      {queue.length === 0 ? (
        <p className="muted"><em>Geen items in de wachtrij.</em></p>
      ) : (
        queue.map((q) => {
          const src = safeHref(q.sourceUrl);
          return (
            <article key={`${q.itemType}-${q.itemId}`} className="card item">
              <div className="badges">
                <span className="badge">{q.itemType === "CLAIM" ? "Claim" : "Incident"}</span>
                <span className="badge">{q.leaderName}</span>
                {q.proposedOutcome && <span className="badge">Voorgestelde uitkomst: {q.proposedOutcome}</span>}
              </div>
              {q.itemType === "CLAIM" ? <blockquote className="statement">{q.title}</blockquote> : (<><h3>{q.title}</h3><p>{q.description}</p></>)}
              <p className="muted small">
                {q.itemType === "CLAIM" ? "Gedaan op" : "Datum:"} {fmt(q.occurredOrMadeAt)}
                {q.specificity !== null && ` • specificiteit ${q.specificity}`}
                {src && <> • <a href={src} rel="noopener noreferrer nofollow" target="_blank">oorspronkelijke bron</a></>}
              </p>

              <details open>
                <summary>Bronnen: {q.independentSources} onafhankelijk geteld</summary>
                <ul>
                  {q.evidence.map((e, i) => {
                    const href = safeHref(e.url);
                    const arc = safeHref(e.archiveUrl);
                    return (
                      <li key={i}>
                        {href ? <a href={href} rel="noopener noreferrer nofollow" target="_blank">{e.publisherKey}</a> : e.publisherKey}{" "}
                        <span className="muted small">({TIERS[e.tier] ?? e.tier}{e.archived ? "" : ", niet gearchiveerd: telt niet mee"})</span>
                        {arc && <> • <a href={arc} rel="noopener noreferrer nofollow" target="_blank">archief</a></>}
                      </li>
                    );
                  })}
                  {q.evidence.length === 0 && <li className="muted">Nog geen bronnen.</li>}
                </ul>
              </details>

              <p className="small">
                Stemmen: {q.confirmVotes} bevestigd • {q.rejectVotes} afgewezen • {q.needsMoreVotes} meer bewijs nodig
              </p>
              <p className="muted small">{q.progress}</p>
              {q.escalated && (role === "EDITOR" || role === "ADMIN")
                ? <ConflictResolution itemId={q.itemId} itemType={q.itemType} />
                : q.escalated
                  ? <p className="small"><strong>Tegenstrijdige stemmen:</strong> een redacteur beslist. Verdere stemmen zijn niet nodig.</p>
                  : q.editorResolved === "CONFIRM"
                    ? <p className="small">Een redacteur heeft de stemmen beslecht; verdere stemmen zijn niet nodig. Het item wacht op de overige eisen hierboven.</p>
                    : <VoteAction itemId={q.itemId} itemType={q.itemType} myVote={q.myVote} />}
            </article>
          );
        })
      )}
    </main>
  );
}
