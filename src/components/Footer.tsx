import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <p className="muted small">
        Onjuiste informatie gezien? Elk dossier-item heeft een link om een verzoek tot verwijdering of rectificatie in te dienen. · <Link href="/staff/verification">Redactie</Link>
      </p>
    </footer>
  );
}
