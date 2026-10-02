import Link from "next/link";
import { connection } from "next/server";
import { DISCLAIMER } from "../components/ItemParts";
import { SearchInput } from "../components/SearchInput";
import { getRecentLeaders, getRecentPublicItems } from "../services/publicDirectory";

export default async function HomePage() {
  // Render per request: this page reads live data and must not be frozen at build time.
  await connection();
  const [leaders, recent] = await Promise.all([getRecentLeaders(6), getRecentPublicItems(5)]);

  return (
    <main className="page page-wide">
      <section className="hero">
        <h1>Onafhankelijke verificatie &amp; dossieropbouw</h1>
        <p className="muted">
          Feitelijke controle van uitspraken en incidenten van publieke figuren, met geborgd recht op wederhoor en transparante bronvermelding.
        </p>
        <SearchInput placeholder="Zoek op leider, uitspraak of incident…" autoFocus />
      </section>

      <section>
        <h2>Recent bijgewerkte dossiers</h2>
        {leaders.length === 0 ? (
          <p className="muted"><em>Er zijn nog geen openbare dossiers.</em></p>
        ) : (
          <div className="stats">
            {leaders.map((l) => (
              <Link key={l.id} href={`/leaders/${l.slug}`} className="card leader-card">
                <strong>{l.displayName}</strong>
                <span className="muted small">{[l.tradition, l.country].filter(Boolean).join(" • ") || "Publiek figuur"}</span>
                <span className="muted small">{l.publicItems} openbare {l.publicItems === 1 ? "item" : "items"}</span>
              </Link>
            ))}
          </div>
        )}
        <p className="muted small">Dossiers worden getoond op recente geverifieerde activiteit, niet op beoordeling of score.</p>
      </section>

      <section>
        <h2>Laatste verificaties</h2>
        {recent.length === 0 ? (
          <p className="muted"><em>Nog geen geverifieerde items.</em></p>
        ) : (
          recent.map((item) => (
            <article key={`${item.type}-${item.id}`} className="card item">
              <div className="badges">
                <span className={`badge ${item.type === "CLAIM" ? "badge-claim" : "badge-incident"}`}>{item.type === "CLAIM" ? "Claim" : "Incident"}</span>
                <span className="badge">Geverifieerd</span>
              </div>
              <p><Link href={item.type === "CLAIM" ? `/claims/${item.id}` : `/incidents/${item.id}`}>{item.title}</Link></p>
              <p className="muted small"><Link href={`/leaders/${item.leaderSlug}`}>{item.leaderName}</Link></p>
            </article>
          ))
        )}
      </section>
      <p className="muted small disclaimer">{DISCLAIMER}</p>
    </main>
  );
}
