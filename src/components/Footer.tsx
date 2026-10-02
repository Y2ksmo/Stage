import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <p className="muted small">
        <Link href="/methodology">Methodologie</Link> · Onjuiste informatie gezien? Elk dossier-item heeft een link om een verzoek tot verwijdering of rectificatie in te dienen. · <Link href="/staff/login">Redactie</Link>
      </p>
    </footer>
  );
}
