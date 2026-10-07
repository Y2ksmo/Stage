"use server";

import { quoteCategories } from "./content";
import { initialQuoteState, type QuoteState } from "./quote-state";

function clean(value: FormDataEntryValue | null, max: number) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

export async function submitQuote(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  if (clean(formData.get("fax"), 80)) {
    return { ...initialQuoteState, message: "We could not send that request. Email hello@elvisandsonsservices.com instead." };
  }

  const name = clean(formData.get("name"), 80);
  const email = clean(formData.get("email"), 120);
  const phone = clean(formData.get("phone"), 30);
  const category = clean(formData.get("category"), 80);
  const details = clean(formData.get("details"), 2000);
  const errors: QuoteState["errors"] = {};

  if (name.length < 2) errors.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) errors.phone = "Enter a phone number with at least 10 digits.";
  if (!quoteCategories.some((item) => item.label === category)) errors.category = "Select a service category.";
  if (details.length < 12) errors.details = "Add a short note — locations, timeline, or what you need done.";

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "Check the highlighted fields and try again.",
      errors,
      submission: null,
    };
  }

  return {
    ok: true,
    message: `Thank you, ${name}. Your ${category} is confirmed. Email the desk or call during operating hours and we will take it from here.`,
    errors: {},
    submission: { name, email, phone, category, details },
  };
}
