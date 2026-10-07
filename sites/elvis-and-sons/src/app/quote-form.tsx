"use client";

import { useActionState, useEffect, useState } from "react";
import { submitQuote } from "./actions";
import { btnPrimary, btnSecondary, contact, container, quoteCategories, quoteLabel, type QuoteKey } from "./content";
import { IconCheck, IconMail, IconPhone } from "./icons";
import { initialQuoteState, type QuoteField } from "./quote-state";

const fieldClass =
  "min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-[#1E293B] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/25";

function mailtoHref(submission: { name: string; email: string; phone: string; category: string; details: string }) {
  const subject = encodeURIComponent(`${submission.category} — ${submission.name}`);
  const raw = `Name: ${submission.name}\nEmail: ${submission.email}\nPhone: ${submission.phone}\nService: ${submission.category}\n\n${submission.details}`.slice(0, 1500);
  const body = encodeURIComponent(raw);
  return `mailto:${contact.email}?subject=${subject}&body=${body}`;
}

function QuoteFields({ initialCategory, onReset }: { initialCategory: string; onReset: () => void }) {
  const [state, action, pending] = useActionState(submitQuote, initialQuoteState);
  const [category, setCategory] = useState(initialCategory);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (initialCategory) setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    const onCategory = (event: Event) => {
      const label = quoteLabel((event as CustomEvent<QuoteKey>).detail);
      if (label) setCategory(label);
    };
    window.addEventListener("elvis-category", onCategory);
    return () => window.removeEventListener("elvis-category", onCategory);
  }, []);

  useEffect(() => {
    if (state.ok || !state.message) return;
    const first = (Object.keys(state.errors) as QuoteField[])[0];
    if (first) document.getElementById(first)?.focus();
  }, [state]);

  const placeholders: Record<string, string> = {
    "Moving & Hauling": "Pickup and drop-off addresses, move date, stairs or elevator, and what needs to be moved.",
    "Debris & Junk Removal": "What needs to go, where it is, and the city in Maryland, Virginia, or D.C.",
    "Deep Cleaning": "Property address, move-in or move-out, and the size of the home or office.",
    "Interior Painting": "Rooms to paint, the property address, and when you need it finished.",
    "Parking & Unparking": "Property or event location, date, and how many vehicles.",
  };
  const placeholder = placeholders[category] ?? "The address, the date, and what you need moved, hauled, cleaned, or painted.";

  if (state.ok && state.submission) {
    const submission = state.submission;
    return (
      <div role="status" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.45)] sm:p-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-[#1D4ED8]">
          <IconCheck />
        </span>
        <h3 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">Quote request confirmed</h3>
        <p className="mt-3 text-[#334155]">{state.message}</p>
        <dl className="mt-6 space-y-3 rounded-xl bg-[#F8FAFC] p-4 text-sm">
          <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
            <dt className="font-semibold text-[#0F172A]">Name</dt>
            <dd className="break-words">{submission.name}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
            <dt className="font-semibold text-[#0F172A]">Email</dt>
            <dd className="break-words">{submission.email}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
            <dt className="font-semibold text-[#0F172A]">Phone</dt>
            <dd>{submission.phone}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
            <dt className="font-semibold text-[#0F172A]">Service</dt>
            <dd>{submission.category}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a href={mailtoHref(submission)} className={btnPrimary}>
            Email this request
          </a>
          <button type="button" className={btnSecondary} onClick={onReset}>
            Start another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.45)]" aria-describedby={state.message ? "quote-status" : undefined}>
      <div className="h-1.5 rounded-t-2xl bg-[#2563EB]" />
      <div className="p-6 sm:p-8">
        <h3 className="text-xl font-semibold text-[#0F172A]">Send a quote request</h3>
        <p className="mt-2 text-sm text-[#475569]">All fields are required. We use them only to respond to this inquiry.</p>
        {state.message ? (
          <p id="quote-status" role="alert" className="mt-4 rounded-lg bg-[#FEF2F2] px-3 py-2 text-sm font-medium text-[#7F1D1D]">
            {state.message}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-[#0F172A]">Full Name</label>
            <input id="name" name="name" type="text" autoComplete="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(state.errors.name)} aria-describedby={state.errors.name ? "name-error" : undefined} className={`${fieldClass} ${state.errors.name ? "border-[#B91C1C]" : ""}`} />
            {state.errors.name ? <p id="name-error" className="mt-1.5 text-sm text-[#7F1D1D]">{state.errors.name}</p> : null}
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[#0F172A]">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={120} spellCheck={false} value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(state.errors.email)} aria-describedby={state.errors.email ? "email-error" : undefined} className={`${fieldClass} ${state.errors.email ? "border-[#B91C1C]" : ""}`} />
            {state.errors.email ? <p id="email-error" className="mt-1.5 text-sm text-[#7F1D1D]">{state.errors.email}</p> : null}
          </div>
          <div>
            <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-[#0F172A]">Phone Number</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} aria-invalid={Boolean(state.errors.phone)} aria-describedby={state.errors.phone ? "phone-error" : undefined} className={`${fieldClass} ${state.errors.phone ? "border-[#B91C1C]" : ""}`} />
            {state.errors.phone ? <p id="phone-error" className="mt-1.5 text-sm text-[#7F1D1D]">{state.errors.phone}</p> : null}
          </div>
          <div>
            <label htmlFor="category" className="mb-1.5 block text-sm font-semibold text-[#0F172A]">Service Category</label>
            <div className="relative">
              <select id="category" name="category" value={category} onChange={(event) => setCategory(event.target.value)} aria-invalid={Boolean(state.errors.category)} aria-describedby={state.errors.category ? "category-error" : undefined} className={`${fieldClass} appearance-none pr-10 ${state.errors.category ? "border-[#B91C1C]" : ""}`}>
                <option value="">Select a service category</option>
                {quoteCategories.map((item) => (
                  <option key={item.key} value={item.label}>{item.label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500" aria-hidden="true">
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 8 5 5 5-5" />
                </svg>
              </span>
            </div>
            {state.errors.category ? <p id="category-error" className="mt-1.5 text-sm text-[#7F1D1D]">{state.errors.category}</p> : null}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="details" className="mb-1.5 block text-sm font-semibold text-[#0F172A]">Project Details / Locations</label>
            <textarea id="details" name="details" rows={5} maxLength={2000} value={details} onChange={(event) => setDetails(event.target.value)} placeholder={placeholder} aria-invalid={Boolean(state.errors.details)} aria-describedby={state.errors.details ? "details-error" : undefined} className={`${fieldClass} min-h-32 py-3 ${state.errors.details ? "border-[#B91C1C]" : ""}`} />
            {state.errors.details ? <p id="details-error" className="mt-1.5 text-sm text-[#7F1D1D]">{state.errors.details}</p> : null}
          </div>
        </div>

        <div hidden>
          <label htmlFor="fax">Fax</label>
          <input id="fax" name="fax" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <button type="submit" className={`${btnPrimary} mt-6 w-full sm:w-auto`} disabled={pending}>
          {pending ? "Sending…" : "Send Quote Request"}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-[#475569]">
          By sending this request you agree to the <a className="font-semibold text-[#1D4ED8] underline-offset-2 hover:underline" href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </form>
  );
}

export function QuoteSection({ initialCategory }: { initialCategory: string }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <section id="contact" className="scroll-mt-28 bg-white py-20 sm:py-24" aria-labelledby="contact-heading">
      <div className={`${container} grid items-start gap-12 lg:grid-cols-12`}>
        <div className="lg:col-span-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B45309]">Quote & inquiry</p>
          <h2 id="contact-heading" className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#0F172A] sm:text-4xl">
            Tell us the job and where it is
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[#334155]">
            Text or call {contact.phoneDisplay} for immediate assistance, or send the details for an upfront price.
          </p>
          <ol className="mt-8 space-y-4">
            {[
              ["01", "Share the job", "Address, date, and what needs to be moved, hauled, cleaned, or painted."],
              ["02", "Get an upfront price", "A clear number before the crew starts. No surprises at checkout."],
              ["03", "Schedule the crew", "Work is booked after you approve the estimate."],
            ].map(([step, title, body]) => (
              <li key={step} className="flex gap-4">
                <span className="text-sm font-semibold tracking-[0.14em] text-[#B45309]">{step}</span>
                <div>
                  <p className="font-semibold text-[#0F172A]">{title}</p>
                  <p className="mt-1 text-sm text-[#475569]">{body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#B45309]">Call or text</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <a className="inline-flex items-center gap-2 font-semibold text-[#0F172A] hover:text-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2563EB]" href={contact.phoneHref}>
                  <IconPhone className="h-4 w-4 text-[#B45309]" />
                  {contact.phoneDisplay}
                </a>
              </li>
              <li>
                <a className="inline-flex items-center gap-2 font-semibold text-[#0F172A] hover:text-[#1D4ED8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2563EB]" href={`mailto:${contact.email}`}>
                  <IconMail className="h-4 w-4 text-[#B45309]" />
                  {contact.email}
                </a>
              </li>
            </ul>
            <ul className="mt-4 space-y-1 text-sm text-[#475569]">
              {contact.areas.map((area) => (
                <li key={area}>{area}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-[#475569]">Text or call for immediate assistance.</p>
          </div>
        </div>

        <div id="quote" className="scroll-mt-28 lg:col-span-7">
          <QuoteFields key={formKey} initialCategory={initialCategory} onReset={() => setFormKey((value) => value + 1)} />
        </div>
      </div>
    </section>
  );
}
