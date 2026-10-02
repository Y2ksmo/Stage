"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { TURNSTILE_SITE_KEY, TurnstileWidget } from "./TurnstileWidget";

type Step = "email" | "code";

/** Email login: enter the address, then the 6-digit code from the message. The reply is the same for any address. */
export function StaffLogin({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Er ging iets mis. Probeer het opnieuw.");
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post("/api/auth/login/request", { email, turnstileToken: captcha });
      setStep("code"); // shown for every address, so it reveals nothing about which accounts exist
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setBusy(false);
      setResetSignal((n) => n + 1); // single-use token
    }
  }

  async function onCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await post("/api/auth/login/verify", { email, code: code.trim() });
      setCode("");
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inloggen mislukt.");
    } finally {
      setBusy(false);
    }
  }

  const errorBox = <div aria-live="polite">{error && <p className="card notice-bad" role="alert">{error}</p>}</div>;

  if (step === "email") {
    return (
      <form onSubmit={onEmail}>
        <label htmlFor="login-email">E-mailadres</label>
        <input id="login-email" type="text" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} required />
        <TurnstileWidget onToken={setCaptcha} resetSignal={resetSignal} />
        {errorBox}
        <button type="submit" disabled={busy || !email.trim() || (!!TURNSTILE_SITE_KEY && !captcha)}>{busy ? "Bezig…" : "Stuur inlogcode"}</button>
      </form>
    );
  }
  return (
    <form onSubmit={onCode}>
      <p className="muted small">Als dit e-mailadres bij ons bekend is, hebben wij een code van 6 cijfers gestuurd (15 minuten geldig). U kunt ook de link in die e-mail openen.</p>
      <label htmlFor="login-code">Inlogcode</label>
      <input id="login-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} disabled={busy} required />
      {errorBox}
      <div className="button-row">
        <button type="submit" disabled={busy || code.length !== 6}>{busy ? "Bezig…" : "Inloggen"}</button>
        <button type="button" className="btn-secondary" onClick={() => { setStep("email"); setCode(""); setError(null); }} disabled={busy}>Ander adres of nieuwe code</button>
      </div>
    </form>
  );
}

/** Magic-link landing: logging in needs an explicit click, so mail scanners that pre-open links cannot use up the link. */
export function ConfirmLogin({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      if (!res.ok) throw new Error("Deze link is ongeldig, verlopen of al gebruikt. Vraag een nieuwe inlogcode aan.");
      router.push("/staff/verification");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inloggen mislukt.");
      setBusy(false);
    }
  }

  return (
    <div>
      <p>U staat op het punt in te loggen als redactielid. Klik op de knop om te bevestigen.</p>
      <div aria-live="polite">{error && <p className="card notice-bad" role="alert">{error}</p>}</div>
      <button onClick={confirm} disabled={busy}>{busy ? "Bezig…" : "Inloggen"}</button>
    </div>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button className="btn-secondary" onClick={async () => { await fetch("/api/auth/session", { method: "DELETE" }); router.refresh(); }}>
      Uitloggen
    </button>
  );
}
