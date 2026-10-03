"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Decision = "APPROVED" | "REJECTED";

export function ReplyReviewAction({ replyId }: { replyId: string }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(decision: Decision) {
    if (decision === "REJECTED" && !notes.trim()) {
      setError("Een toelichting is verplicht bij een afwijzing.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      // The HttpOnly session cookie is sent automatically (same origin).
      const res = await fetch("/api/moderation/reply-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId, decision, notes: notes.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Sessie verlopen of niet ingelogd. Laad de pagina opnieuw." : (data.error ?? "Er is een fout ingetreden."));
      }
      setRejecting(false);
      setNotes("");
      router.refresh(); // reload the server-rendered queue
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er is een fout ingetreden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="review-actions">
      <div aria-live="polite">{error && <p className="card notice-bad" role="alert">{error}</p>}</div>

      {rejecting ? (
        <div>
          <label htmlFor={`notes-${replyId}`}>Reden voor afwijzing (verplicht)</label>
          <textarea
            id={`notes-${replyId}`}
            className="short"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bijv. bevat laster of schending van de privacy van derden…"
            disabled={isSubmitting}
          />
          <div className="button-row">
            <button className="btn-danger" onClick={() => submit("REJECTED")} disabled={isSubmitting}>
              {isSubmitting ? "Verwerken…" : "Bevestig afwijzing"}
            </button>
            <button className="btn-secondary" onClick={() => { setRejecting(false); setError(null); }} disabled={isSubmitting}>
              Annuleren
            </button>
          </div>
        </div>
      ) : (
        <div className="button-row">
          <button className="btn-ok" onClick={() => submit("APPROVED")} disabled={isSubmitting}>
            {isSubmitting ? "Verwerken…" : "Goedkeuren & publiceren"}
          </button>
          <button className="btn-secondary" onClick={() => setRejecting(true)} disabled={isSubmitting}>
            Afwijzen…
          </button>
        </div>
      )}
    </div>
  );
}
