import type { Metadata } from "next";
import { describeReplyWindow } from "../../services/rightOfReply";
import { ReplyForm } from "./reply-form";

// The URL carries a secret token: keep it out of search indexes and out of Referer headers.
export const metadata: Metadata = {
  title: "Recht op Wederhoor",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

interface PageProps {
  searchParams: Promise<{ token?: string | string[] }>;
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="page">
      <div className="card notice-bad" role="alert">
        <h1>{title}</h1>
        <p>{children}</p>
      </div>
    </main>
  );
}

export default async function ReplyPage({ searchParams }: PageProps) {
  const raw = (await searchParams).token;
  const token = Array.isArray(raw) ? raw[0] : raw;

  if (!token) {
    return <Notice title="Ongeldige of ontbrekende link">Er is geen unieke reactie-token opgegeven. Gebruik de link die via e-mail is verstuurd.</Notice>;
  }

  const view = await describeReplyWindow(token);
  if (!view) {
    return <Notice title="Ongeldige of onbekende link">Deze link is niet herkend. Controleer of u de volledige link uit de e-mail heeft gebruikt.</Notice>;
  }
  if (view.state === "EXPIRED") {
    return <Notice title="De termijn is verstreken">De wederhoortermijn voor {view.leaderName} is gesloten. Een reactie kan niet meer via deze link worden ingediend. Neem contact op met de redactie als u een correctie wilt aanvragen.</Notice>;
  }
  if (view.state === "CLOSED") {
    return <Notice title="Al beantwoord">Voor dit item is de wederhoor al afgerond. Deze link kan niet opnieuw worden gebruikt.</Notice>;
  }

  return (
    <main className="page">
      <h1>Recht op Wederhoor</h1>
      <p className="muted">
        U kunt hier uw officiële reactie of documentatie indienen, of het aanbod expliciet afwijzen.
      </p>
      <div className="card">
        <p><strong>Betreft:</strong> {view.leaderName}</p>
        <p><strong>Item:</strong> {view.itemTitle}</p>
        <p><strong>Uiterlijk:</strong> {view.deadline.toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" })} (UTC)</p>
      </div>
      <ReplyForm token={token} />
    </main>
  );
}
