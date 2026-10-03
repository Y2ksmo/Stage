import Link from "next/link";
import { HeaderSearch } from "./HeaderSearch";

export function Header() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">Dossier Platform</Link>
        <nav aria-label="Hoofdnavigatie" className="site-nav">
          <Link href="/">Home</Link>
          <Link href="/search">Zoeken</Link>
          <Link href="/methodology">Methodologie</Link>
        </nav>
        <HeaderSearch />
      </div>
    </header>
  );
}
