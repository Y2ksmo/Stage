import type { Metadata } from "next";
import Link from "next/link";
import { contact } from "../content";

export const metadata: Metadata = {
  title: { absolute: "Terms of Service | Elvis & Sons Multilink Ventures" },
  description: "Terms for using the Elvis & Sons Multilink Ventures website and requesting a quote.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-32 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B45309]">Elvis & Sons</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-[#0F172A]">Terms of Service</h1>
      <p className="mt-4 text-[#334155]">Effective October 7, 2026. These terms cover use of {contact.domain} and requests sent through it.</p>

      <h2 className="mt-10 text-xl font-semibold text-[#0F172A]">Quotes are estimates until confirmed</h2>
      <p className="mt-3 leading-relaxed text-[#1E293B]">
        A form submission or phone call is a request for an estimate. It is not a booking. Work begins only after Elvis & Sons confirms the scope, price, and schedule in writing or by a clear email acceptance. Dates discussed on the site are not reserved until that confirmation.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-[#0F172A]">Services</h2>
      <p className="mt-3 leading-relaxed text-[#1E293B]">
        IT, web, hosting, DNS, automation, and support work is delivered as described in the accepted estimate. Moving, packing, and freight work is performed by licensed and insured crews within the access conditions you provide, including building rules, elevators, and parking. If the site conditions differ from what was described, the estimate may be revised before the crew proceeds.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-[#0F172A]">Acceptable use</h2>
      <p className="mt-3 leading-relaxed text-[#1E293B]">
        Do not misuse the form, attempt to disrupt the site, or submit information you do not have the right to share. Site copy, the logo, and page design belong to Elvis & Sons Multilink Ventures and may not be copied for another business.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-[#0F172A]">Liability</h2>
      <p className="mt-3 leading-relaxed text-[#1E293B]">
        Information on this website is a general description of services. It is not a warranty of a particular outcome. Responsibility for a project is defined in the estimate you accept, not by these website terms alone.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-[#0F172A]">Contact</h2>
      <p className="mt-3 leading-relaxed text-[#1E293B]">
        Questions about these terms: <a className="font-semibold text-[#1D4ED8] hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a> or <a className="font-semibold text-[#1D4ED8] hover:underline" href={contact.phoneHref}>{contact.phoneDisplay}</a>.
      </p>
      <p className="mt-8">
        <Link className="text-sm font-semibold text-[#1D4ED8] hover:underline" href="/elvis-and-sons">Back to the homepage</Link>
      </p>
    </main>
  );
}
