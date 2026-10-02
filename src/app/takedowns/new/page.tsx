import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TakedownRequestForm } from "../../../components/TakedownRequestForm";
import { getPublicClaim, getPublicIncident } from "../../../services/publicItems";
import { getPublicLeaderMeta } from "../../../services/publicLeaders";

export const metadata: Metadata = { title: "Verzoek tot verwijdering of rectificatie", robots: { index: false, follow: false } };

interface PageProps {
  searchParams: Promise<{ targetType?: string | string[]; targetId?: string | string[] }>;
}
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function NewTakedownPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const type = one(sp.targetType);
  const id = one(sp.targetId);
  if (!id || (type !== "CLAIM" && type !== "INCIDENT" && type !== "LEADER")) notFound();

  // The form only exists for items that are publicly visible, and shows the person exactly what they are contesting.
  let label: string;
  let back: string;
  let targetId = id;
  if (type === "CLAIM") {
    const c = await getPublicClaim(id);
    if (!c) notFound();
    label = `Uitspraak van ${c.leader.displayName}: “${c.statementText.length > 160 ? `${c.statementText.slice(0, 160)}…` : c.statementText}”`;
    back = `/claims/${c.id}`;
  } else if (type === "INCIDENT") {
    const i = await getPublicIncident(id);
    if (!i) notFound();
    label = `Incident rond ${i.leader.displayName}: ${i.title}`;
    back = `/incidents/${i.id}`;
  } else {
    const l = await getPublicLeaderMeta(id);
    if (!l) notFound();
    label = `Het volledige profiel van ${l.displayName}`;
    back = `/leaders/${id}`;
    targetId = l.id; // the API needs the id even when a slug was given
  }

  return (
    <main className="page">
      <nav className="small"><Link href={back}>← Terug</Link></nav>
      <h1>Verzoek tot verwijdering of rectificatie</h1>
      <div className="card"><p className="muted small">U dient een verzoek in over:</p><p><strong>{label}</strong></p></div>
      <p className="muted small">
        Uw verzoek wordt door ons juridisch team beoordeeld. Het item wordt niet automatisch verborgen. Wij nemen alleen contact op als dat nodig is; uw e-mailadres wordt niet gepubliceerd en alleen voor dit verzoek gebruikt. U kunt per 24 uur maximaal 5 verzoeken indienen.
      </p>
      <TakedownRequestForm targetType={type} targetId={targetId} />
    </main>
  );
}
