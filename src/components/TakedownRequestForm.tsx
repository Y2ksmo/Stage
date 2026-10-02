"use client";

import { useState, type FormEvent } from "react";
import { TURNSTILE_SITE_KEY, TurnstileWidget } from "./TurnstileWidget";

const MAX_GROUNDS = 5000;

interface Props {
  targetType: "CLAIM" | "INCIDENT" | "LEADER";
  targetId: string;
}

export function TakedownRequestForm({ targetType, targetId }: Props) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [grounds, setGrounds] = useState("");
  const [urls, setUrls] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const evidenceUrls = urls.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!grounds.trim()) return setError("Beschrijf waarom dit item onjuist is of uw rechten schendt.");
    if (evidenceUrls.length > 10) return setError("Voeg maximaal 10 links toe.");
    if (TURNSTILE_SITE_KEY && !captcha) return setError("Voltooi eerst de beveiligingscontrole.");

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/takedown-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterEmail: email, requesterName: name || undefined, targetType, targetId, grounds, evidenceUrls, turnstileToken: captcha }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; requestId?: string };
      if (!res.ok) throw new Error(data.error ?? "Het verzoek kon niet worden verzonden. Probeer het later opnieuw.");
      setReference(data.requestId ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Het verzoek kon niet worden verzonden.");
    } finally {
      setBusy(false);
      // a Turnstile token works exactly once, whatever the outcome
      setResetSignal((n) => n + 1);
    }
  }

  if (reference !== null) {
    return (
      <div className="card notice-ok" role="status">
        <h2>Uw verzoek is ontvangen</h2>
        <p>Ons juridisch team beoordeelt uw verzoek. Er wordt niets automatisch verborgen of verwijderd; wij besluiten na toetsing.</p>
        <p>Er wordt <strong>geen bevestiging per e-mail</strong> verstuurd. Bewaar daarom uw referentie: <code>{reference}</code></p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor="email">E-mailadres (verplicht)</label>
      <input id="email" type="text" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} required />
      <label htmlFor="name">Naam of organisatie (optioneel)</label>
      <input id="name" type="text" autoComplete="name" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />

      <label htmlFor="grounds">Waarom is dit item onjuist, onvolledig of in strijd met uw rechten?</label>
      <textarea id="grounds" value={grounds} maxLength={MAX_GROUNDS} onChange={(e) => setGrounds(e.target.value)} disabled={busy} required />
      <div className="muted small">{grounds.length} / {MAX_GROUNDS} tekens</div>

      <label htmlFor="urls">Links naar onderbouwing (optioneel, één per regel, max 10)</label>
      <textarea id="urls" className="short" value={urls} onChange={(e) => setUrls(e.target.value)} disabled={busy} placeholder="https://" />

      <TurnstileWidget onToken={setCaptcha} resetSignal={resetSignal} />
      <div aria-live="polite">{error && <p className="card notice-bad" role="alert">{error}</p>}</div>
      <button type="submit" disabled={busy || (!!TURNSTILE_SITE_KEY && !captcha)}>{busy ? "Bezig met versturen…" : "Verzoek indienen"}</button>
    </form>
  );
}
