/**
 * Cloudflare Turnstile server-side verification.
 *
 * A token produced in the browser proves nothing until the SERVER confirms it with Cloudflare, so every
 * protected endpoint calls verifyTurnstile() before doing any work.
 *
 *  - TURNSTILE_SECRET_KEY unset, development/test: verification is skipped (forms work without keys).
 *  - TURNSTILE_SECRET_KEY unset, production: FAILS CLOSED (an unprotected public form is worse than a visible error).
 *  - Cloudflare unreachable / errors: FAILS CLOSED with a "try again later" result.
 *  - Tokens are single-use; Cloudflare rejects replays.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason: "MISSING" | "INVALID" | "UNAVAILABLE" | "NOT_CONFIGURED" };

type FetchLike = (url: string, init: { method: string; body: URLSearchParams; signal: AbortSignal }) => Promise<{ ok: boolean; json(): Promise<unknown> }>;
let fetchOverride: FetchLike | null = null;
/** Test hook: replace the network call (pass null to restore). */
export function setTurnstileFetch(f: FetchLike | null) {
  fetchOverride = f;
}

export async function verifyTurnstile(token: unknown, ip?: string | null): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("TURNSTILE_SECRET_KEY is not set in production; refusing the request.");
      return { ok: false, reason: "NOT_CONFIGURED" };
    }
    return { ok: true, skipped: true };
  }
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return { ok: false, reason: "MISSING" };

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const res = await (fetchOverride ?? (fetch as unknown as FetchLike))(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, reason: "UNAVAILABLE" };
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success === true) return { ok: true };
    // internal-error / timeout codes mean Cloudflare could not decide; everything else means a bad token
    const codes = data["error-codes"] ?? [];
    return { ok: false, reason: codes.includes("internal-error") ? "UNAVAILABLE" : "INVALID" };
  } catch (error) {
    console.error("turnstile verification failed", error instanceof Error ? error.message : error);
    return { ok: false, reason: "UNAVAILABLE" };
  }
}

/** Dutch message and HTTP status for a failed check (shared by every protected route). */
export function turnstileFailure(result: Extract<TurnstileResult, { ok: false }>): { status: number; error: string } {
  switch (result.reason) {
    case "MISSING":
    case "INVALID":
      return { status: 400, error: "Bevestig dat u geen robot bent en probeer het opnieuw." };
    default:
      return { status: 503, error: "De beveiligingscontrole is tijdelijk niet beschikbaar. Probeer het later opnieuw." };
  }
}
