"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Vote = "CONFIRM" | "REJECT" | "NEEDS_MORE";

const LABELS: Record<Vote, string> = {
  CONFIRM: "Bevestigen: bronnen kloppen",
  REJECT: "Afwijzen: niet te verifiëren",
  NEEDS_MORE: "Meer bewijs nodig",
};

interface VoteActionProps {
  itemId: string;
  itemType: "CLAIM" | "INCIDENT";
  /** The reviewer's earlier vote on this item, if any (they may change it while the item is in review). */
  myVote?: Vote | null;
}

export function VoteAction({ itemId, itemType, myVote = null }: VoteActionProps) {
  const router = useRouter();
  const [choice, setChoice] = useState<Vote | null>(null);
  const [rationale, setRationale] = useState("");
  const [noConflict, setNoConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(vote: Vote) {
    if (!rationale.trim()) return setError("Een onderbouwing is verplicht bij elke stem.");
    if (!noConflict) return setError("Bevestig dat u geen belangenconflict heeft met dit item.");

    setIsSubmitting(true);
    setError(null);
    try {
      // The HttpOnly session cookie is sent automatically (same origin).
      const res = await fetch("/api/verification/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId, vote, rationale: rationale.trim(), hasDeclaredConflict: false }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Sessie verlopen of niet ingelogd. Laad de pagina opnieuw." : (data.error ?? "Fout bij het opslaan van uw stem."));
      }
      setChoice(null);
      setRationale("");
      setNoConflict(false);
      router.refresh(); // reload the queue: a verified/rejected item drops out
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er is een onbekende fout opgetreden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="review-actions">
      <div aria-live="polite">{error && <p className="card notice-bad" role="alert">{error}</p>}</div>
      {myVote && !choice && <p className="muted small">Uw huidige stem: <strong>{LABELS[myVote]}</strong>. U kunt deze wijzigen zolang het item in beoordeling is.</p>}

      {choice ? (
        <div>
          <label htmlFor={`rationale-${itemId}`}>Onderbouwing voor “{LABELS[choice]}” (verplicht)</label>
          <textarea
            id={`rationale-${itemId}`}
            className="short"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Waarop baseert u deze stem? Noem bronnen, datum en context die u heeft gecontroleerd…"
            disabled={isSubmitting}
          />
          <label className="choice">
            <input type="checkbox" checked={noConflict} onChange={(e) => setNoConflict(e.target.checked)} disabled={isSubmitting} />
            <span>Ik verklaar dat ik geen belangenconflict heb met dit item of de betrokkene.</span>
          </label>
          <div className="button-row">
            <button onClick={() => submit(choice)} disabled={isSubmitting}>{isSubmitting ? "Verwerken…" : "Stem bevestigen"}</button>
            <button className="btn-secondary" onClick={() => { setChoice(null); setError(null); }} disabled={isSubmitting}>Annuleren</button>
          </div>
        </div>
      ) : (
        <div className="button-row">
          <button className="btn-ok" onClick={() => setChoice("CONFIRM")}>Bevestigen…</button>
          <button className="btn-secondary" onClick={() => setChoice("NEEDS_MORE")}>Meer bewijs nodig…</button>
          <button className="btn-danger" onClick={() => setChoice("REJECT")}>Afwijzen…</button>
        </div>
      )}
    </div>
  );
}
