import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConfirmLogin, StaffLogin } from "../../../components/StaffSession";
import { currentSession } from "../../../lib/staffSession";

// The URL may carry a one-time token: keep it out of search indexes and out of Referer headers.
export const metadata: Metadata = { title: "Redactie: inloggen", robots: { index: false, follow: false }, referrer: "no-referrer" };

interface PageProps { searchParams: Promise<{ token?: string | string[] }> }

export default async function StaffLoginPage({ searchParams }: PageProps) {
  if (await currentSession()) redirect("/staff/verification");
  const raw = (await searchParams).token;
  const token = Array.isArray(raw) ? raw[0] : raw;

  return (
    <main className="page">
      <h1>Redactie: inloggen</h1>
      {token ? (
        <ConfirmLogin token={token} />
      ) : (
        <>
          <p className="muted">Vul uw e-mailadres in; u ontvangt een eenmalige inlogcode.</p>
          <StaffLogin redirectTo="/staff/verification" />
        </>
      )}
    </main>
  );
}
