import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Footer } from "./footer";
import { Header } from "./header";
import { Stage } from "./stage";
import "./brand.css";
import "./motion.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-elvis",
});

export const metadata: Metadata = {
  title: { absolute: "Elvis & Sons Multilink Ventures" },
  description:
    "Professional residential and commercial moves, estate cleanouts, deep cleaning, and interior painting across Maryland, Virginia, and Washington, D.C.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} elvis-root min-h-screen`}>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(location.pathname==='/'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('elvis-intro')}catch(e){}",
          }}
        />
        <a className="elvis-skip" href="#content">Skip to content</a>
        <Header />
        <div id="content" tabIndex={-1}>{children}</div>
        <Footer />
        <Stage />
        <noscript>
          <style>{`html.elvis-intro main, html.elvis-intro header, html.elvis-intro footer, .elvis-haul { opacity: 1 !important; } .elvis-haul { display: none !important; }`}</style>
        </noscript>
      </body>
    </html>
  );
}
