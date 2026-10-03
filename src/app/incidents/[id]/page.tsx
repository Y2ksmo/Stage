import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CATEGORIES, DISCLAIMER, Evidence, TakedownLink, fmtDate } from "../../../components/ItemParts";
import { RightOfReplyBlock } from "../../../components/RightOfReplyBlock";
import { getPublicIncident } from "../../../services/publicItems";

const load = cache(getPublicIncident);
interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const incident = await load(id);
  if (!incident) return { title: "Incident niet gevonden", robots: { index: false } };
  return {
    title: `${incident.title} - ${incident.leader.displayName}`,
    description: `Verificatiestatus, bronnen en wederhoor bij een gedocumenteerd incident rond ${incident.leader.displayName}.`,
    robots: incident.disputed ? { index: false, follow: true } : undefined,
  };
}

export default async function IncidentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const incident = await load(id);
  if (!incident) notFound();

  return (
    <main className="page page-wide">
      <nav className="small"><Link href={`/leaders/${incident.leader.slug}`}>← Terug naar het dossier van {incident.leader.displayName}</Link></nav>

      <article className="card item">
        <div className="badges">
          <span className="badge badge-incident">Incident</span>
          <span className="badge">{CATEGORIES[incident.category] ?? incident.category}</span>
          <span className="badge">{incident.isAllegationOnly ? "Beschuldiging, geen vastgesteld feit" : "Vastgesteld door officiële bevinding"}</span>
          {incident.disputed && <span className="badge badge-disputed">Betwist</span>}
        </div>
        <h1>{incident.title}</h1>
        <p>{incident.description}</p>

        {incident.disputed && (
          <p className="card notice-note small" role="note">
            Dit item wordt formeel betwist. Het telt tijdelijk niet mee in de score en wordt juridisch beoordeeld.
          </p>
        )}

        <dl className="facts">
          <div><dt>Betreft</dt><dd>{incident.leader.displayName}</dd></div>
          <div><dt>Datum</dt><dd>{fmtDate(incident.occurredAt)}</dd></div>
          <div><dt>Ernst</dt><dd>{incident.severity} van 5</dd></div>
        </dl>

        <section>
          <h2>Recht op wederhoor</h2>
          <RightOfReplyBlock data={incident.response} />
        </section>

        <section>
          <h2>Bronnen</h2>
          {incident.evidence.length > 0 ? <Evidence list={incident.evidence} open /> : <p className="muted">Geen bronnen beschikbaar.</p>}
        </section>

        <TakedownLink targetType="INCIDENT" targetId={incident.id} />
      </article>
      <p className="muted small disclaimer">{DISCLAIMER}</p>
    </main>
  );
}
