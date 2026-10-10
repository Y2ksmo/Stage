export const container = "mx-auto w-full max-w-[1120px] px-5 sm:px-6 lg:px-8";

export const contact = {
  email: "info@elvisandsonsservices.com",
  phoneDisplay: "(443) 380-9960",
  phoneHref: "tel:+14433809960",
  domain: "elvisandsonsservices.com",
  areas: ["Maryland (MD)", "Virginia (VA)", "Washington, D.C."],
};

export const quoteCategories = [
  { key: "moving", label: "Moving & Hauling" },
  { key: "junk", label: "Debris & Junk Removal" },
  { key: "cleaning", label: "Deep Cleaning" },
  { key: "painting", label: "Interior Painting" },
  { key: "parking", label: "Parking & Unparking" },
] as const;

export type QuoteKey = (typeof quoteCategories)[number]["key"];

export function quoteLabel(key: string | undefined): string {
  return quoteCategories.find((item) => item.key === key)?.label ?? "";
}

export const nav = [
  { href: "/#top", label: "Home", section: "top" },
  { href: "/#services", label: "Services", section: "services" },
  { href: "/#quote", label: "Quote", section: "quote" },
  { href: "/#reviews", label: "Reviews", section: "reviews" },
  { href: "/#about", label: "About Us", section: "about" },
  { href: "/#contact", label: "Contact", section: "contact" },
];

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93C5FD] disabled:cursor-not-allowed disabled:opacity-60";

export const btnAccent =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-[#D97706] px-4 text-sm font-semibold text-[#0F172A] shadow-sm transition hover:bg-[#B45309] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FBBF24] disabled:cursor-not-allowed disabled:opacity-60";

export const btnGhostOnDark =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-white/30 bg-white/5 px-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-[#0F172A] transition hover:border-[#2563EB] hover:text-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]";

export const services = [
  {
    id: "moving",
    title: "Moving & Hauling",
    body: "Residential and commercial furniture loading, unloading, and regional transport.",
    quote: "moving" as const,
  },
  {
    id: "junk",
    title: "Debris & Junk Removal",
    body: "Basement, garage, and post-construction waste disposed of quickly and responsibly.",
    quote: "junk" as const,
  },
  {
    id: "cleaning",
    title: "Deep Cleaning",
    body: "Move-in and move-out scrubbing and property preparation.",
    quote: "cleaning" as const,
  },
  {
    id: "painting",
    title: "Interior Painting",
    body: "Quality surface prep and interior painting for homes and offices.",
    quote: "painting" as const,
  },
  {
    id: "parking",
    title: "Parking & Unparking",
    body: "Vehicle parking and unparking assistance for residential, commercial, and event needs.",
    quote: "parking" as const,
  },
];

export const jobs = [
  {
    src: "/jobs/curb-haul.jpg",
    alt: "Black pickup at the curb with the door open, the bed piled with lumber, cardboard, hose, and yard debris.",
    kicker: "Junk removal",
    title: "Full load at the curb",
    span: "min-h-[22rem] sm:col-span-2 lg:row-span-2 lg:min-h-[36rem]",
  },
  {
    src: "/jobs/construction-haul.jpg",
    alt: "Pickup bed in the rain, loaded with plywood, framing lumber, and a log.",
    kicker: "Debris haul",
    title: "Construction debris",
    span: "min-h-64 sm:col-span-2",
  },
  {
    src: "/jobs/household-cleanout.jpg",
    alt: "Room staged for a cleanout, with a mattress, lamp, bicycle, and household items.",
    kicker: "Cleanout",
    title: "Household load",
    span: "min-h-64",
  },
  {
    src: "/jobs/lumber-detail.jpg",
    alt: "Close view of lumber, plywood, and a log stacked in a pickup bed.",
    kicker: "Scrap",
    title: "Lumber and scrap",
    span: "min-h-64",
  },
  {
    src: "/jobs/fixture-removal.jpg",
    alt: "Bathroom sink, cabinet doors, and a vanity frame tied down in a pickup bed.",
    kicker: "Fixtures",
    title: "Sink and cabinets",
    span: "min-h-64",
  },
  {
    src: "/jobs/tire-haul.jpg",
    alt: "Maroon pickup loaded with tires, a traffic cone, a stump, and bagged junk.",
    kicker: "Junk removal",
    title: "Tires and bulky junk",
    span: "min-h-64",
  },
  {
    src: "/jobs/driveway-haul.jpg",
    alt: "Pickup in a driveway, the bed stacked with boards, hose, and cardboard.",
    kicker: "Pickup",
    title: "Driveway pickup",
    span: "min-h-64",
  },
  {
    src: "/jobs/box-truck.jpg",
    alt: "Open rear of a box truck with a few bags inside, parked on a residential street.",
    kicker: "Fleet",
    title: "Box truck on the job",
    span: "min-h-64",
  },
];

export const reasons = [
  {
    title: "Fast Response",
    body: "Same-day service when you need it.",
    detail: "Fast response times and reliable crews across the DMV.",
  },
  {
    title: "Licensed & Insured",
    body: "Professional crews you can trust.",
    detail: "Fully licensed and insured for your peace of mind.",
  },
  {
    title: "Upfront Pricing",
    body: "No surprises at checkout.",
    detail: "Transparent pricing before the work begins.",
  },
  {
    title: "Careful Handling",
    body: "Friendly service on every job.",
    detail: "Careful handling from the first call through the finished space.",
  },
];

export const metrics = [
  { title: "Same-Day Service", body: "Fast response when you need it." },
  { title: "Licensed & Insured", body: "Professional crews you can trust." },
  { title: "Upfront Pricing", body: "No surprises at checkout." },
  { title: "MD • VA • DC", body: "Coverage across the DMV." },
];

export const reviews = [
  {
    title: "Excellent moving crew!",
    quote: "They arrived on time, protected our furniture, and made the entire move stress-free.",
    place: "Silver Spring, MD",
  },
  {
    title: "Junk removal was fast.",
    quote: "Same-day pickup, a fair price, and a clean space when the job was finished.",
    place: "Alexandria, VA",
  },
  {
    title: "Spotless deep clean.",
    quote: "Our rental looked brand new and ready for the next tenant.",
    place: "Washington, DC",
  },
];
