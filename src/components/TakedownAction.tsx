"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "DISPUTE" | "WITHDRAW" | "REJECT_REQUEST" | "RESTORE";

interface TakedownActionProps {
  requestId: string;
  requestStatus: "OPEN" | "UNDER_REVIEW";
  targetType: "CLAIM" | "INCIDENT" | string;
  targetId: string;
  /** False for profile/review requests, which cannot yet be acted on through the system. */
  actionable: boolean;
}

const LABELS: Record<Action, { title: string; confirm: string; hint: string; danger?: boolean }> = {
  DISPUTE: { title: "Tijdelijk betwisten", confirm: "Bevestig betwisten", hint: "Het item krijgt de status 'betwist', verdwijnt uit de score en blijft zichtbaar met een banner. Het verzoek blijft in behandeling.", danger: true },
  WITHDRAW: { title: "Definitief verwijderen", confirm: "Bevestig definitieve verwijdering", hint: "Het item wordt ingetrokken en kan hier niet meer worden gewijzigd. Het verzoek wordt toegewezen.", danger: true },
  REJECT_REQUEST: { title: "Verzoek afwijzen", confirm: "Bevestig afwijzing", hint: "Het item blijft ongewijzigd. Het verzoek wordt gesloten als afgewezen." },
  RESTORE: { title: "Content handhaven", confirm: "Bevestig handhaving", hint: "Het item verlaat de betwisting en wordt opnieuw getoetst aan de verificatieregels. Het verzoek wordt gesloten als afgewezen." },
};

export function TakedownAction({ requestId, requestStatus, targetType, targetId, actionable }: TakedownActionProps) {
  const router = useRouter();
  const [action, setAction] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Which decisions make sense depends on where the request stands.
  const options: Action[] = !actionable ? ["REJECT_REQUEST"] : requestStatus === "OPEN" ? ["DISPUTE", "WITHDRAW", "REJECT_REQUEST"] : ["WITHDRAW", "RESTORE"];

  async function submit(chosen: Action) {
    if (!reason.trim()) return setError("Een juridische onderbouwing is verplicht voor dit besluit.");
    if (chosen === "WITHDRAW" && !window.confirm("Definitief verwijderen kan hier niet worden teruggedraaid. Doorgaan?")) return;

    const itemRef = { itemType: targetType, itemId: targetId, takedownRequestId: requestId, reason: reason.trim() };
    const call: Record<Action, [string, unknown]> = {
      DISPUTE: ["/api/moderation/takedown", { ...itemRef, targetStatus: "DISPUTED" }],
      WITHDRAW: ["/api/moderation/takedown", { ...itemRef, targetStatus: "WITHDRAWN" }],
      RESTORE: ["/api/moderation/takedown/restore", itemRef],
      REJECT_REQUEST: ["/api/moderation/takedown/reject", { takedownRequestId: requestId, reason: reason.trim() }],
    };
    const [url, body] = call[chosen];

    setIsSubmitting(true);
    setError(null);
    try {
      // The HttpOnly session cookie is sent automatically (same origin).
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(res.status === 401 ? "Sessie verlopen of niet ingelogd. Laad de pagina opnieuw." : (data.error ?? "Fout bij het verwerken van het besluit."));
      }
      setAction(null);
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er is een onbekende fout opgetreden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="review-actions">
      <div aria-live="polite">{error && <p className="card notice-bad" role="alert">{error}</p>}</div>
      {!actionable && <p className="muted small">Verzoeken over een profiel of review kunnen nog niet via het systeem worden uitgevoerd. U kunt het verzoek hier alleen afwijzen; een inwilliging moet buiten het systeem worden afgehandeld.</p>}

      {action ? (
        <div>
          <label htmlFor={`reason-${requestId}`}>Juridische toelichting voor “{LABELS[action].title}” (verplicht)</label>
          <p className="muted small">{LABELS[action].hint}</p>
          <textarea
            id={`reason-${requestId}`}
            className="short"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Licht de juridische overweging toe (bijv. AVG-grondslag, toetsing laster/smaad)…"
            disabled={isSubmitting}
          />
          <div className="button-row">
            <button className={LABELS[action].danger ? "btn-danger" : undefined} onClick={() => submit(action)} disabled={isSubmitting}>
              {isSubmitting ? "Verwerken…" : LABELS[action].confirm}
            </button>
            <button className="btn-secondary" onClick={() => { setAction(null); setError(null); }} disabled={isSubmitting}>Annuleren</button>
          </div>
        </div>
      ) : (
        <div className="button-row">
          {options.map((o) => (
            <button key={o} className={LABELS[o].danger ? "btn-danger" : "btn-secondary"} onClick={() => setAction(o)}>{LABELS[o].title}…</button>
          ))}
        </div>
      )}
    </div>
  );
}
