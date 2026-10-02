import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LogoutButton, StaffLogin } from "../../../components/StaffSession";
import { ReplyReviewAction } from "../../../components/ReplyReviewAction";
import { SESSION_COOKIE, resolveSessionToken } from "../../../lib/auth";
import { safeHref } from "../../../lib/safeUrl";
import { listPendingReplies } from "../../../services/rightOfReply";
import { VerificationError } from "../../../services/verification";

export const metadata: Metadata = { title: "Wederhoor-reacties beoordelen", robots: { index: false, follow: false } };

const fmt = (d: Date | null) => (d ? d.toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" }) + " (UTC)" : "");

export default async function ReplyReviewPage() {
  // cookies() is async in this Next.js version.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await resolveSessionToken(token) : null;

  if (!session) {
    return (
      <main className="page">
        <h1>Redactie: inloggen</h1>
        <p className="muted">Plak uw sessietoken om de wachtrij met wederhoor-reacties te openen.</p>
        <StaffLogin />
      </main>
    );
  }

  let replies;
  try {
    replies = await listPendingReplies(session.userId);
  } catch (e) {
    if (e instanceof VerificationError && e.code === "FORBIDDEN") {
      return (
        <main className="page">
          <div className="card notice-bad" role="alert">
            <h1>Geen toegang</h1>
            <p>Uw account heeft geen rechten om wederhoor-reacties te beoordelen (redacteur, juridisch of beheerder vereist).</p>
          </div>
          <LogoutButton />
        </main>
      );
    }
    throw e;
  }

  return (
    <main className="page page-wide">
      <div className="profile-head">
        <h1>Wederhoor-reacties beoordelen</h1>
        <LogoutButton />
      </div>
      <p className="muted small">
        Goedgekeurde reacties worden openbaar naast het item getoond. Afwijzen houdt de reactie achter (de tekst blijft bewaard) en vereist een reden. Een besluit kan later worden herzien.
      </p>

      {replies.length === 0 ? (
        <p className="muted"><em>Geen reacties in de wachtrij.</em></p>
      ) : (
        replies.map((r) => (
          <article key={r.replyId} className="card item">
            <div className="badges">
              <span className="badge">{r.itemType === "CLAIM" ? "Claim" : "Incident"}</span>
              {r.leaderName && <span className="badge">{r.leaderName}</span>}
            </div>
            {r.itemTitle && <p className="muted small">Betreft: {r.itemTitle}</p>}
            <p className="muted small">Ontvangen: {fmt(r.respondedAt)}</p>
            <blockquote>{r.responseText}</blockquote>
            {r.evidenceUrls.length > 0 && (
              <ul className="reply-links">
                {r.evidenceUrls.map((u) => {
                  const href = safeHref(u);
                  return <li key={u}>{href ? <a href={href} rel="noopener noreferrer nofollow" target="_blank">{u}</a> : <span className="muted">{u} (geen geldige link)</span>}</li>;
                })}
              </ul>
            )}
            <ReplyReviewAction replyId={r.replyId} />
          </article>
        ))
      )}
    </main>
  );
}
