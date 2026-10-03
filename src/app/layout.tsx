import type { Metadata } from "next";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Dossier Platform", template: "%s | Dossier Platform" },
  description: "Onafhankelijke verificatie van uitspraken en incidenten van publieke figuren, met recht op wederhoor en transparante bronvermelding.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <a href="#main" className="skip-link">Ga naar de inhoud</a>
        <Header />
        {/* Target for the skip link; each page renders its own <main> landmark inside. */}
        <div id="main" tabIndex={-1}>{children}</div>
        <Footer />
      </body>
    </html>
  );
}
