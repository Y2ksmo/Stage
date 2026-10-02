"use client";

import { useState, type FormEvent } from "react";

const MAX_TEXT = 10_000;
const MAX_URLS = 10;

type Choice = "ACCEPT" | "DECLINE";
type Status = { kind: "idle" } | { kind: "sending" } | { kind: "error"; message: string } | { kind: "done"; choice: Choice };

export function ReplyForm({ token }: { token: string }) {
  const [choice, setChoice] = useState<Choice>("ACCEPT");
  const [text, setText] = useState("");
  const [urls, setUrls] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const evidenceUrls = urls.split("\n").map((u) => u.trim()).filter(Boolean);
    if (choice === "ACCEPT" && !text.trim()) {
      return setStatus({ kind: "error", message: "Vul uw reactie in, of kies voor afwijzen." });
    }
    if (evidenceUrls.length > MAX_URLS) {
      return setStatus({ kind: "error", message: `Voeg maximaal ${MAX_URLS} links toe.` });
    }
    if (choice === "DECLINE" && !window.confirm("Weet u zeker dat u niet wilt reageren? Dit kan niet worden gewijzigd.")) return;

    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: choice,
          replyText: choice === "ACCEPT" ? text : undefined,
          evidenceUrls: choice === "ACCEPT" ? evidenceUrls : undefined,
        }),
      });
      if (res.ok) return setStatus({ kind: "done", choice });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ kind: "error", message: data.error ?? "Er ging iets mis. Probeer het later opnieuw." });
    } catch {
      setStatus({ kind: "error", message: "Geen verbinding. Controleer uw internet en probeer opnieuw." });
    }
  }

  if (status.kind === "done") {
    return (
      <div className="card notice-ok" role="status">
        <h2>{status.choice === "ACCEPT" ? "Uw reactie is ontvangen" : "Uw keuze is vastgelegd"}</h2>
        <p>
          {status.choice === "ACCEPT"
            ? "Uw reactie wordt naast het betreffende item gepubliceerd. Dank u."
            : "Wij hebben vastgelegd dat u niet wilt reageren. De beoordeling gaat verder."}
        </p>
      </div>
    );
  }

  const sending = status.kind === "sending";
  return (
    <form onSubmit={onSubmit} noValidate>
      <fieldset disabled={sending}>
        <legend>Uw keuze</legend>
        <label className="choice">
          <input type="radio" name="choice" checked={choice === "ACCEPT"} onChange={() => setChoice("ACCEPT")} />
          <span>Ik wil reageren</span>
        </label>
        <label className="choice">
          <input type="radio" name="choice" checked={choice === "DECLINE"} onChange={() => setChoice("DECLINE")} />
          <span>Ik wil niet reageren (de beoordeling gaat dan door; dit wordt neutraal vermeld)</span>
        </label>
      </fieldset>

      {choice === "ACCEPT" && (
        <>
          <label htmlFor="replyText">Uw reactie</label>
          <textarea id="replyText" value={text} maxLength={MAX_TEXT} onChange={(e) => setText(e.target.value)} disabled={sending} required />
          <div className="muted">{text.length} / {MAX_TEXT} tekens. Uw reactie wordt openbaar naast het item getoond.</div>

          <label htmlFor="urls">Links naar documentatie (optioneel, één per regel, max {MAX_URLS})</label>
          <textarea id="urls" className="short" value={urls} onChange={(e) => setUrls(e.target.value)} disabled={sending} placeholder="https://" />
        </>
      )}

      <div aria-live="polite">
        {status.kind === "error" && <p className="card notice-bad" role="alert">{status.message}</p>}
      </div>
      <button type="submit" disabled={sending}>{sending ? "Bezig met versturen…" : "Versturen"}</button>
    </form>
  );
}
