import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DISCLAIMER, Evidence, OUTCOMES, TakedownLink, fmtDate as fmt } from "../../../components/ItemParts";
import { RightOfReplyBlock } from "../../../components/RightOfReplyBlock";
import { safeHref } from "../../../lib/safeUrl";
import { getPublicLeaderMeta, getPublicLeaderProfile } from "../../../services/publicLeaders";

// In this Next.js version, params and searchParams are Promises.
interface LeaderPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ limit?: string | string[]; offset?: string | string[] }>;
}

const BANDS: Record<string, string> = { LOW: "Laag", ELEVATED: "Verhoogd", HIGH: "Hoog", SEVERE: "Zeer hoog", INSUFFICIENT_DATA: "Onvoldoende data" };
const DIMENSIONS: Record<string, string> = {
  PREDICTION: "Voorspellingen", FINANCIAL: "Financiële transparantie", BEHAVIORAL: "Gedrag & integriteit",
  DOCTRINAL: "Eigen leer & normen", CULTIC: "Controle-indicatoren (BITE)",
};
const num = (v: string | string[] | undefined) => {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^\d{1,6}$/.test(s) ? Number(s) : undefined;
};

export async function generateMetadata({ params }: LeaderPageProps): Promise<Metadata> {
  const { id } = await params;
  const leader = await getPublicLeaderMeta(id);
  if (!leader) return { title: "Leider niet gevonden" };
  return {
    title: `${leader.displayName} - Dossier & verificatiestatus`,
    description: leader.bio || `Bekijk het geverifieerde dossier en de wederhoor-gegevens van ${leader.displayName}.`,
  };
}

export default async function LeaderProfilePage({ params, searchParams }: LeaderPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const data = await getPublicLeaderProfile(id, { limit: num(sp.limit), offset: num(sp.offset) });
  if (!data) notFound();

  const { leader, score, stats, items, page } = data;
  const reply = stats.rightOfReply;
  const outcomes = stats.claimOutcomes as Record<string, number>;
  // Per-dimension numbers are only shown alongside an overall score: when the engine says "insufficient
  // data", the individual low-confidence numbers would be misleading on their own.
  const dims = (score.riskScore !== null && Array.isArray(score.dimensions) ? (score.dimensions as unknown as Array<{ key: string; score: number | null; confidence: number }>) : []).filter(
    (d) => d && typeof d.score === "number",
  );
  const meta = [leader.tradition, leader.country].filter(Boolean).join(" • ");
  const base = `/leaders/${leader.slug}`;
  const prev = page.offset > 0 ? Math.max(0, page.offset - page.limit) : null;
  const next = page.hasMoreClaims || page.hasMoreIncidents ? page.offset + page.limit : null;

  return (
    <main className="page page-wide">
      <section className="card">
        <div className="profile-head">
          <div>
            <h1>{leader.displayName}</h1>
            {meta && <p className="muted">{meta}</p>}
            {leader.bio && <p>{leader.bio}</p>}
          </div>
          <div className="score-box" aria-label="Risico-indicator">
            <span className="muted small">Risico-indicator</span>
            <div className="score-value">
              {score.riskScore !== null ? `${score.riskScore}/100` : BANDS.INSUFFICIENT_DATA}
            </div>
            <div className="small">{score.riskScore !== null ? `Niveau: ${BANDS[score.band] ?? score.band}` : "Nog te weinig geverifieerde gegevens"}</div>
            {score.riskScore !== null && <div className="muted small">Zekerheid: {Math.round(score.confidence * 100)}%</div>}
          </div>
        </div>
        <p className="muted small">
          Hoger = meer risico-indicatoren in geverifieerde, geciteerde gegevens. Dit is een samenvatting, geen oordeel over de persoon.
          {score.methodologyVersion ? ` Methodologie v${score.methodologyVersion}.` : ""}
        </p>
        {dims.length > 0 && (
          <ul className="dims">
            {dims.map((d) => (
              <li key={d.key}>
                <span>{DIMENSIONS[d.key] ?? d.key}</span> <strong>{Math.round(d.score as number)}</strong>
                <span className="muted small"> (zekerheid {Math.round(d.confidence * 100)}%)</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stats">
        <div className="card">
          <span className="muted small">Gedocumenteerde dossiers</span>
          <div className="stat-value">{stats.totalItems}</div>
          <span className="muted small">{stats.totalClaims} claims • {stats.totalIncidents} incidenten{stats.disputedItems > 0 ? ` • ${stats.disputedItems} betwist` : ""}</span>
        </div>
        <div className="card">
          <span className="muted small">Wederhoor-respons</span>
          <div className="stat-value">{reply.responseRate !== null ? `${reply.responseRate}%` : "Nog niet meetbaar"}</div>
          <span className="muted small">{reply.closedWindows > 0 ? `${reply.responded} van ${reply.closedWindows} afgesloten termijnen` : "Geen afgesloten termijnen"}</span>
        </div>
        <div className="card">
          <span className="muted small">Wederhoor-status</span>
          <div>{reply.responded} gereageerd • {reply.declined} afgeslagen</div>
          <span className="muted small">{reply.noResponse} verstreken • {reply.awaitingResponse} lopend</span>
        </div>
        <div className="card">
          <span className="muted small">Uitkomsten van claims</span>
          <div className="small">
            <div>Uitgekomen: {outcomes.FULFILLED ?? 0}</div>
            <div>Niet uitgekomen: {outcomes.FAILED ?? 0}</div>
            <div>Aangepast/ingetrokken: {(outcomes.MODIFIED ?? 0) + (outcomes.RETRACTED ?? 0)}</div>
            <div>Nog open: {outcomes.PENDING ?? 0}</div>
          </div>
        </div>
      </section>

      <section>
        <h2>Publiek dossier</h2>
        {items.claims.length === 0 && items.incidents.length === 0 ? (
          <p className="muted"><em>Er zijn momenteel geen openbare, geverifieerde items voor deze leider.</em></p>
        ) : (
          <>
            {items.claims.map((claim) => {
              const src = safeHref(claim.sourceUrl);
              return (
                <article key={claim.id} className="card item">
                  <div className="badges">
                    <span className="badge badge-claim">Claim</span>
                    <span className="badge">{OUTCOMES[claim.outcome] ?? claim.outcome}</span>
                    {claim.disputed && <span className="badge badge-disputed">Betwist</span>}
                  </div>
                  <blockquote className="statement"><Link href={`/claims/${claim.id}`}>{claim.statementText}</Link></blockquote>
                  {claim.summary && <p className="muted">{claim.summary}</p>}
                  <p className="muted small">
                    Gedaan op {fmt(claim.dateMade)}{claim.targetDate ? ` • streefdatum ${fmt(claim.targetDate)}` : ""}
                    {src && <> • <a href={src} rel="noopener noreferrer nofollow" target="_blank">bron{claim.sourceTimestamp ? ` (${claim.sourceTimestamp})` : ""}</a></>}
                  </p>
                  {claim.disputed && <p className="small notice-note">Dit item wordt betwist en telt niet mee in de score.</p>}
                  <Evidence list={claim.evidence} />
                  <RightOfReplyBlock data={claim.response} />
                </article>
              );
            })}
            {items.incidents.map((incident) => (
              <article key={incident.id} className="card item">
                <div className="badges">
                  <span className="badge badge-incident">Incident</span>
                  <span className="badge">{incident.isAllegationOnly ? "Beschuldiging, geen vastgesteld feit" : "Vastgesteld door officiële bevinding"}</span>
                  {incident.disputed && <span className="badge badge-disputed">Betwist</span>}
                </div>
                <h3><Link href={`/incidents/${incident.id}`}>{incident.title}</Link></h3>
                <p>{incident.description}</p>
                <p className="muted small">Datum: {fmt(incident.occurredAt)} • ernst {incident.severity}/5</p>
                {incident.disputed && <p className="small notice-note">Dit item wordt betwist en telt niet mee in de score.</p>}
                <Evidence list={incident.evidence} />
                <RightOfReplyBlock data={incident.response} />
              </article>
            ))}
          </>
        )}

        {(prev !== null || next !== null) && (
          <nav className="pager" aria-label="Paginering">
            {prev !== null && <Link href={`${base}?offset=${prev}&limit=${page.limit}`}>← Vorige</Link>}
            {next !== null && <Link href={`${base}?offset=${next}&limit=${page.limit}`}>Volgende →</Link>}
          </nav>
        )}
      </section>

      <TakedownLink targetType="LEADER" targetId={leader.id} />
      <p className="muted small disclaimer">{DISCLAIMER}</p>
    </main>
  );
}
