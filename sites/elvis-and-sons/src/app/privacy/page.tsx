import type { Metadata } from "next";
import Link from "next/link";
import { contact } from "../content";

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy | Elvis & Sons Multilink Ventures" },
  description: "How Elvis & Sons Multilink Ventures handles information submitted through the quote form on elvisandsonsservices.com.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-32 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B45309]">Elvis & Sons</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-[#0F172A]">Privacy Policy</h1>
      <p className="mt-4 text-[#334155]">Effective October 7, 2026. This policy describes the Elvis & Sons Multilink Ventures website at {contact.domain}.</p>

      <h2 className="mt-10 text-xl font-semibold text-[#0F172A]">Information you submit</h2>
      <p className="mt-3 leading-relaxed text-[#1E293B]">
        The quote form asks for your name, email address, phone number, service, and project details or locations. That information is used to review a moving, junk removal, cleaning, painting, or parking request and reply to you. Do not include payment card numbers or government identification numbers in the project details.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-[#0F172A]">How a request is handled</h2>
      <p className="mt-3 leading-relaxed text-[#1E293B]">
        Submitting the form checks the fields and confirms the request on this page. For immediate assistance, text or call {contact.phoneDisplay}, or email {contact.email}. We do not sell personal information, and this page does not run advertising or analytics cookies.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-[#0F172A]">How long it is kept</h2>
      <p className="mt-3 leading-relaxed text-[#1E293B]">
        Messages you send to the desk are kept for as long as needed to estimate, schedule, and complete the job, and for ordinary business records. You may ask us to correct or delete inquiry details by writing to {contact.email}.
      </p>

      <h2 className="mt-8 text-xl font-semibold text-[#0F172A]">Contact</h2>
      <p className="mt-3 leading-relaxed text-[#1E293B]">
        Elvis & Sons Multilink Ventures · <a className="font-semibold text-[#1D4ED8] hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a> · <a className="font-semibold text-[#1D4ED8] hover:underline" href={contact.phoneHref}>{contact.phoneDisplay}</a>
      </p>
      <p className="mt-8">
        <Link className="text-sm font-semibold text-[#1D4ED8] hover:underline" href="/">Back to the homepage</Link>
      </p>
    </main>
  );
}
