import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { DISCLAIMER, Evidence, OUTCOMES, TakedownLink, fmtDate } from "../../../components/ItemParts";
import { RightOfReplyBlock } from "../../../components/RightOfReplyBlock";
import { safeHref } from "../../../lib/safeUrl";
import { getPublicClaim } from "../../../services/publicItems";

// In this Next.js version params is a Promise. React cache() dedupes the lookup between metadata and page.
const load = cache(getPublicClaim);
interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const claim = await load(id);
  if (!claim) return { title: "Claim niet gevonden", robots: { index: false } };
  const excerpt = claim.statementText.length > 70 ? `${claim.statementText.slice(0, 70)}…` : claim.statementText;
  return {
    title: `Uitspraak van ${claim.leader.displayName}: ${excerpt}`,
    description: `Verificatiestatus, bronnen en wederhoor bij een geciteerde uitspraak van ${claim.leader.displayName}.`,
    // Contested items are kept out of search indexes while the dispute is open.
    robots: claim.disputed ? { index: false, follow: true } : undefined,
  };
}

export default async function ClaimDetailPage({ params }: PageProps) {
  const { id } = await params;
  const claim = await load(id);
  if (!claim) notFound();
  const src = safeHref(claim.sourceUrl);

  return (
    <main className="page page-wide">
      <nav className="small"><Link href={`/leaders/${claim.leader.slug}`}>← Terug naar het dossier van {claim.leader.displayName}</Link></nav>

      <article className="card item">
        <div className="badges">
          <span className="badge badge-claim">Claim</span>
          <span className="badge">{OUTCOMES[claim.outcome] ?? claim.outcome}</span>
          <span className="badge">{claim.disputed ? "Betwist" : "Geverifieerd"}</span>
        </div>
        <h1>Uitspraak van {claim.leader.displayName}</h1>
        <blockquote className="statement">{claim.statementText}</blockquote>
        {claim.summary && <p className="muted">{claim.summary}</p>}

        {claim.disputed && (
          <p className="card notice-note small" role="note">
            Dit item wordt formeel betwist. Het telt tijdelijk niet mee in de score en wordt juridisch beoordeeld.
          </p>
        )}

        <dl className="facts">
          <div><dt>Gedaan op</dt><dd>{fmtDate(claim.dateMade)}</dd></div>
          {claim.targetDate && <div><dt>Streefdatum</dt><dd>{fmtDate(claim.targetDate)}</dd></div>}
          <div><dt>Uitkomst</dt><dd>{OUTCOMES[claim.outcome] ?? claim.outcome}{claim.outcomeDecidedAt ? ` (vastgesteld ${fmtDate(claim.outcomeDecidedAt)})` : ""}</dd></div>
          {claim.outcomeNote && <div><dt>Toelichting</dt><dd>{claim.outcomeNote}</dd></div>}
          <div><dt>Specificiteit</dt><dd>{claim.specificity} (0 tot 1: hoe expliciet en toetsbaar de uitspraak is)</dd></div>
          {src && <div><dt>Oorspronkelijke bron</dt><dd><a href={src} rel="noopener noreferrer nofollow" target="_blank">{src}</a>{claim.sourceTimestamp ? ` (op ${claim.sourceTimestamp})` : ""}</dd></div>}
        </dl>

        <section>
          <h2>Recht op wederhoor</h2>
          <RightOfReplyBlock data={claim.response} />
        </section>

        <section>
          <h2>Bronnen</h2>
          {claim.evidence.length > 0 ? <Evidence list={claim.evidence} open /> : <p className="muted">Geen bronnen beschikbaar.</p>}
        </section>

        <TakedownLink targetType="CLAIM" targetId={claim.id} />
      </article>
      <p className="muted small disclaimer">{DISCLAIMER}</p>
    </main>
  );
}
