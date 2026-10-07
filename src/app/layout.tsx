import type { Metadata } from "next";
import { SiteChrome } from "../components/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Dossier Platform", template: "%s | Dossier Platform" },
  description: "Onafhankelijke verificatie van uitspraken en incidenten van publieke figuren, met recht op wederhoor en transparante bronvermelding.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
