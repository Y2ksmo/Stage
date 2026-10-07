import { BrandLink } from "./brand-link";
import { contact, services } from "./content";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="bg-[#0F172A] text-slate-300">
      <div className="mx-auto grid w-full max-w-[1120px] gap-10 px-5 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <BrandLink href="/elvis-and-sons#top" className="inline-flex rounded-md text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93C5FD]">
            <Logo onDark />
          </BrandLink>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-300">
            Moving, junk removal, deep cleaning, interior painting, and parking help for homes and businesses across Maryland, Virginia, and Washington, D.C.
          </p>
          <p className="mt-5 text-sm">
            <a className="font-semibold text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93C5FD]" href={contact.phoneHref}>
              Text or call {contact.phoneDisplay}
            </a>
          </p>
        </div>

        <nav aria-label="Services">
          <h2 className="text-sm font-semibold text-white">Services</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {services.map((item) => (
              <li key={item.id}>
                <BrandLink href={`/elvis-and-sons#${item.id}`} className="transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#93C5FD]">
                  {item.title}
                </BrandLink>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-semibold text-white">Service area</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {contact.areas.map((area) => (
              <li key={area}>{area}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-400">{contact.domain}</p>
        </div>

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
            <p>Text or call for immediate assistance.</p>
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
