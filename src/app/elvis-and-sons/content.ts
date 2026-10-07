export const container = "mx-auto w-full max-w-[1120px] px-5 sm:px-6 lg:px-8";

export const contact = {
  email: "hello@elvisandsonsservices.com",
  phoneDisplay: "(800) 555-0148",
  phoneHref: "tel:+18005550148",
  domain: "elvisandsonsservices.com",
  hours: [
    "Office: Monday–Friday, 8:00 a.m.–6:00 p.m.",
    "Moving dispatch: Monday–Saturday, 7:00 a.m.–7:00 p.m.",
    "Technical support: 24/7",
  ],
};

export const quoteCategories = [
  { key: "moving", label: "Moving & Relocation Quote" },
  { key: "it", label: "IT & Web Development Consultation" },
  { key: "general", label: "General Business Support" },
] as const;

export type QuoteKey = (typeof quoteCategories)[number]["key"];
export type ServiceTab = "it" | "moving";

export function quoteLabel(key: string | undefined): string {
  return quoteCategories.find((item) => item.key === key)?.label ?? "";
}

export const nav = [
  { href: "/elvis-and-sons#top", label: "Home", section: "top" },
  { href: "/elvis-and-sons#services", label: "Services", section: "services" },
  { href: "/elvis-and-sons?category=moving#quote", label: "Moving Quote", section: "quote", category: "moving" as const },
  { href: "/elvis-and-sons?tab=it#services", label: "IT Solutions", section: "services", tab: "it" as const },
  { href: "/elvis-and-sons#about", label: "About Us", section: "about" },
  { href: "/elvis-and-sons#contact", label: "Contact", section: "contact" },
];

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93C5FD] disabled:cursor-not-allowed disabled:opacity-60";

export const btnAccent =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-[#D97706] px-4 text-sm font-semibold text-[#0F172A] shadow-sm transition hover:bg-[#B45309] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FBBF24] disabled:cursor-not-allowed disabled:opacity-60";

export const btnGhostOnDark =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-white/30 bg-white/5 px-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-[#0F172A] transition hover:border-[#2563EB] hover:text-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]";

export const serviceLines = {
  it: {
    label: "IT & Digital Solutions",
    summary: "Websites, hosting, DNS, and the technical support that keeps a business reachable.",
    items: [
      {
        id: "web",
        title: "Custom Web Design & Hosting Architecture",
        body: "Sites and hosting planned for clarity, speed, and a clean handoff. Domain, staging, and launch stay with one accountable team.",
        quote: "it" as const,
      },
      {
        id: "network",
        title: "Network Infrastructure & DNS Configuration",
        body: "Network setup and DNS management so email, websites, and internal tools resolve correctly and stay reachable.",
        quote: "it" as const,
      },
      {
        id: "automation",
        title: "Enterprise Business Automation & Digital Support",
        body: "Practical automation and day-to-day technical support that removes repetitive work without disrupting how your team already operates.",
        quote: "it" as const,
      },
    ],
  },
  moving: {
    label: "Moving & Logistics Services",
    summary: "Residential moves, office relocations, and freight handled against a written plan.",
    items: [
      {
        id: "residential",
        title: "Residential & Apartment Moving",
        body: "Home and apartment relocations, from a single room to a full household, with care for furniture, access rules, and building schedules.",
        quote: "moving" as const,
      },
      {
        id: "commercial",
        title: "Office & Commercial Relocation",
        body: "Business moves planned around your operation so equipment is protected and downtime stays inside the window you can absorb.",
        quote: "moving" as const,
      },
      {
        id: "freight",
        title: "Packing, Transport & Freight Handling",
        body: "Packing, loading, and freight coordination for local and longer-haul work, carried by licensed and insured crews.",
        quote: "moving" as const,
      },
    ],
  },
} as const;

export const cardTab: Record<string, ServiceTab> = {
  web: "it",
  network: "it",
  automation: "it",
  residential: "moving",
  commercial: "moving",
  freight: "moving",
};

export const reasons = [
  {
    title: "Verified Expertise",
    body: "Certified IT specialists and experienced logistics teams.",
    detail: "Digital work and physical moves are staffed by people who do that work every week.",
  },
  {
    title: "Transparent Pricing",
    body: "Clear estimates with zero hidden costs or surprise fees.",
    detail: "You see the scope and the number before anyone is scheduled.",
  },
  {
    title: "Tailored Execution",
    body: "Solutions customized to your exact timeline and budget.",
    detail: "The plan follows your date, access constraints, and the systems you already run.",
  },
  {
    title: "Dedicated Support",
    body: "Fast response times for urgent moves or technical needs.",
    detail: "A person answers when a move window slips or a system goes down.",
  },
];

export const metrics = [
  {
    title: "100% Satisfaction Rate",
    body: "The engagement is complete when the agreed outcome is delivered.",
  },
  {
    title: "Licensed & Insured Logistics",
    body: "Residential, commercial, and freight work handled by covered crews.",
  },
  {
    title: "24/7 Technical Support",
    body: "Urgent infrastructure issues reach a person, day or night.",
  },
];

export const movingLinks = [
  { href: "/elvis-and-sons?tab=moving#residential", label: "Residential & Apartment Moving", tab: "moving" as const },
  { href: "/elvis-and-sons?tab=moving#commercial", label: "Office & Commercial Relocation", tab: "moving" as const },
  { href: "/elvis-and-sons?tab=moving#freight", label: "Packing, Transport & Freight", tab: "moving" as const },
  { href: "/elvis-and-sons?category=moving#quote", label: "Request a Moving Quote", category: "moving" as const },
];

export const itLinks = [
  { href: "/elvis-and-sons?tab=it#web", label: "Web Design & Hosting", tab: "it" as const },
  { href: "/elvis-and-sons?tab=it#network", label: "Network & DNS Configuration", tab: "it" as const },
  { href: "/elvis-and-sons?tab=it#automation", label: "Business Automation & Support", tab: "it" as const },
  { href: "/elvis-and-sons?category=it#quote", label: "Book an IT Consultation", category: "it" as const },
];
