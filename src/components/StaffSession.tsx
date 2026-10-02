"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

/** Interim login: paste a session token (from `npm run session:create`) to receive the HttpOnly cookie. */
export function StaffLogin() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Inloggen mislukt.");
      }
      setToken("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inloggen mislukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="token">Sessietoken</label>
      <input id="token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} disabled={busy} required />
      <div aria-live="polite">{error && <p className="card notice-bad" role="alert">{error}</p>}</div>
      <button type="submit" disabled={busy || !token}>{busy ? "Bezig…" : "Inloggen"}</button>
    </form>
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
