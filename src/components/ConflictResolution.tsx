"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Decision = "CONFIRM" | "REJECT";
const MIN = 15;

/** Editor-only: decide an item whose reviewer votes conflict. */
export function ConflictResolution({ itemId, itemType }: { itemId: string; itemType: "CLAIM" | "INCIDENT" }) {
  const router = useRouter();
  const [choice, setChoice] = useState<Decision | null>(null);
  const [rationale, setRationale] = useState("");
  const [noConflict, setNoConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(decision: Decision) {
    if (rationale.trim().length < MIN) return setError(`Een onderbouwing van minstens ${MIN} tekens is verplicht.`);
    if (!noConflict) return setError("Bevestig dat u geen belangenconflict heeft met dit item.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/moderation/resolve-conflict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId, decision, rationale: rationale.trim(), noConflict }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(res.status === 401 ? "Sessie verlopen of niet ingelogd. Laad de pagina opnieuw." : (data.error ?? "Het besluit kon niet worden opgeslagen."));
      setChoice(null);
      setRationale("");
      setNoConflict(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er is een onbekende fout opgetreden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="review-actions">
      <p className="small"><strong>Tegenstrijdige stemmen: redactioneel besluit nodig.</strong> Een besluit “bevestigen” vervangt alleen de stemeis; bronnen, wederhoor en overige eisen blijven gelden. Het besluit wordt met uw onderbouwing vastgelegd.</p>
      <div aria-live="polite">{error && <p className="card notice-bad" role="alert">{error}</p>}</div>
      {choice ? (
        <div>
          <label htmlFor={`resolve-${itemId}`}>Redactionele onderbouwing voor “{choice === "CONFIRM" ? "bevestigen" : "afwijzen"}” (minstens {MIN} tekens)</label>
          <textarea id={`resolve-${itemId}`} className="short" value={rationale} onChange={(e) => setRationale(e.target.value)} disabled={busy} />
          <label className="choice">
            <input type="checkbox" checked={noConflict} onChange={(e) => setNoConflict(e.target.checked)} disabled={busy} />
            <span>Ik verklaar dat ik geen belangenconflict heb met dit item of de betrokkene.</span>
          </label>
          <div className="button-row">
            <button className={choice === "REJECT" ? "btn-danger" : "btn-ok"} onClick={() => submit(choice)} disabled={busy}>{busy ? "Verwerken…" : "Besluit bevestigen"}</button>
            <button className="btn-secondary" onClick={() => { setChoice(null); setError(null); }} disabled={busy}>Annuleren</button>
          </div>
        </div>
      ) : (
        <div className="button-row">
          <button className="btn-ok" onClick={() => setChoice("CONFIRM")}>Stemmen bevestigen…</button>
          <button className="btn-danger" onClick={() => setChoice("REJECT")}>Item afwijzen…</button>
        </div>
      )}
    </div>
  );
}
