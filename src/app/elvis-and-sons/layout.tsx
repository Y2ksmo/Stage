import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Footer } from "./footer";
import { Header } from "./header";
import "./brand.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-elvis",
});

export const metadata: Metadata = {
  title: { absolute: "Elvis & Sons Multilink Ventures" },
  description:
    "From seamless enterprise IT solutions and web infrastructure to stress-free residential and commercial relocations, Elvis & Sons delivers excellence across every project.",
};

export default function ElvisLayout({ children }: { children: React.ReactNode }) {
  return (
    <div lang="en" className={`${jakarta.variable} elvis-root min-h-screen`}>
      <a className="elvis-skip" href="#content">Skip to content</a>
      <Header />
      <div id="content" tabIndex={-1}>{children}</div>
      <Footer />
    </div>
  );
}
