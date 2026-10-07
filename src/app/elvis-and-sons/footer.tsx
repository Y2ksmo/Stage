import { BrandLink } from "./brand-link";
import { contact, itLinks, movingLinks } from "./content";
import { IconFacebook, IconInstagram, IconLinkedIn } from "./icons";
import { Logo } from "./logo";

const social = [
  { label: "LinkedIn", icon: IconLinkedIn },
  { label: "Facebook", icon: IconFacebook },
  { label: "Instagram", icon: IconInstagram },
];

export function Footer() {
  return (
    <footer className="bg-[#0F172A] text-slate-300">
      <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-5 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <BrandLink href="/elvis-and-sons#top" className="inline-flex rounded-md text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93C5FD]">
            <Logo onDark />
          </BrandLink>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-300">
            Elvis & Sons Multilink Ventures delivers IT infrastructure, web systems, and professional moving services from one accountable desk.
          </p>
          <ul className="mt-5 flex gap-2">
            {social.map((item) => (
              <li key={item.label}>
                <a
                  href="/elvis-and-sons#contact"
                  aria-label={`${item.label} — contact Elvis & Sons`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white transition hover:border-white/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93C5FD]"
                >
                  <item.icon className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav aria-label="Moving and logistics">
          <h2 className="text-sm font-semibold text-white">Moving & Logistics</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {movingLinks.map((item) => (
              <li key={item.label}>
                <BrandLink href={item.href} tab={item.tab} category={item.category} className="transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93C5FD]">
                  {item.label}
                </BrandLink>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="IT and digital services">
          <h2 className="text-sm font-semibold text-white">IT & Digital Services</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {itLinks.map((item) => (
              <li key={item.label}>
                <BrandLink href={item.href} tab={item.tab} category={item.category} className="transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93C5FD]">
                  {item.label}
                </BrandLink>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-white">Contact</h2>
          <address className="mt-4 space-y-2.5 text-sm not-italic">
            <p>
              <a className="font-medium text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93C5FD]" href={contact.phoneHref}>
                {contact.phoneDisplay}
              </a>
            </p>
            <p>
              <a className="hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93C5FD]" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
            </p>
            <p className="text-slate-400">{contact.domain}</p>
            <ul className="space-y-1.5 pt-1 text-slate-300">
              {contact.hours.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </address>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3 px-5 py-5 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} {contact.domain}</p>
          <nav aria-label="Legal" className="flex gap-5">
            <BrandLink href="/elvis-and-sons/privacy" className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93C5FD]">
              Privacy Policy
            </BrandLink>
            <BrandLink href="/elvis-and-sons/terms" className="hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93C5FD]">
              Terms of Service
            </BrandLink>
          </nav>
        </div>
      </div>
    </footer>
  );
}
