import Link from "next/link";

export function StaffNav() {
  return (
    <nav className="staff-nav" aria-label="Redactie">
      <Link href="/staff/verification">Verificatie</Link>
      <Link href="/staff/replies">Wederhoor-reacties</Link>
      <Link href="/staff/takedowns">Takedowns</Link>
    </nav>
  );
}
