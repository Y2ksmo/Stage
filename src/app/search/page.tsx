import type { Metadata } from "next";
import Link from "next/link";
import { SearchInput } from "../../components/SearchInput";
import { DISCLAIMER } from "../../components/ItemParts";
import { searchPublic } from "../../services/publicDirectory";

export const metadata: Metadata = { title: "Zoeken", robots: { index: false, follow: true } };

interface PageProps { searchParams: Promise<{ q?: string | string[] }> }

export default async function SearchPage({ searchParams }: PageProps) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const r = await searchPublic(q);
  const total = r.leaders.length + r.claims.length + r.incidents.length;

  return (
    <main className="page page-wide">
      <nav className="small"><Link href="/">← Home</Link></nav>
      <h1>Zoeken</h1>
      <SearchInput defaultValue={r.query} placeholder="Zoek op leider, uitspraak of incident…" />

      {r.query === "" ? null : r.tooShort ? (
        <p className="muted">Voer minstens 2 tekens in.</p>
      ) : total === 0 ? (
        <p className="muted">Geen openbare resultaten voor “{r.query}”. Alleen geverifieerde of betwiste items en de leiders daarvan worden doorzocht.</p>
      ) : (
        <>
          {r.leaders.length > 0 && (
            <section>
              <h2>Dossiers ({r.leaders.length})</h2>
              {r.leaders.map((l) => (
                <article key={l.id} className="card item">
                  <h3><Link href={`/leaders/${l.slug}`}>{l.displayName}</Link></h3>
                  <p className="muted small">{[l.tradition, l.country].filter(Boolean).join(" • ")}{[l.tradition, l.country].some(Boolean) ? " • " : ""}{l.publicItems} openbare {l.publicItems === 1 ? "item" : "items"}</p>
                </article>
              ))}
            </section>
          )}
          {r.claims.length > 0 && (
            <section>
              <h2>Uitspraken ({r.claims.length})</h2>
              {r.claims.map((c) => (
                <article key={c.id} className="card item">
                  <div className="badges"><span className="badge badge-claim">Claim</span>{c.disputed && <span className="badge badge-disputed">Betwist</span>}</div>
                  <p><Link href={`/claims/${c.id}`}>{c.title}</Link></p>
                  <p className="muted small">{c.leaderName}</p>
                </article>
              ))}
            </section>
          )}
          {r.incidents.length > 0 && (
            <section>
              <h2>Incidenten ({r.incidents.length})</h2>
              {r.incidents.map((i) => (
                <article key={i.id} className="card item">
                  <div className="badges"><span className="badge badge-incident">Incident</span>{i.disputed && <span className="badge badge-disputed">Betwist</span>}</div>
                  <p><Link href={`/incidents/${i.id}`}>{i.title}</Link></p>
                  <p className="muted small">{i.leaderName}</p>
                </article>
              ))}
            </section>
          )}
        </>
      )}
      <p className="muted small disclaimer">{DISCLAIMER}</p>
    </main>
  );
}
