export type QuoteField = "name" | "email" | "phone" | "category" | "details";

export type QuoteErrors = Partial<Record<QuoteField, string>>;

export type QuoteSubmission = {
  name: string;
  email: string;
  phone: string;
  category: string;
  details: string;
};

export type QuoteState = {
  ok: boolean;
  message: string;
  errors: QuoteErrors;
  submission: QuoteSubmission | null;
};

export const initialQuoteState: QuoteState = {
  ok: false,
  message: "",
  errors: {},
  submission: null,
};
