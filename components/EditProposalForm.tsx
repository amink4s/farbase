"use client";
import React, { useState } from "react";
import sdk from "@farcaster/miniapp-sdk";

export default function EditProposalForm({ slug, onSuccess }: { slug: string; onSuccess?: () => void }) {
  const [body, setBody] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let res: Response;
      const payload = { body, summary };

      if (sdk && sdk.quickAuth && typeof sdk.quickAuth.fetch === "function") {
        res = await sdk.quickAuth.fetch(`/api/articles/${encodeURIComponent(slug)}/edits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // If not in mini app, try to use fetch with Authorization header if present on window (best-effort)
        res = await fetch(`/api/articles/${encodeURIComponent(slug)}/edits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      await res.json();
      setBody("");
      setSummary("");
      setSuccess("Edit proposal submitted — pending approval.");
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 800, marginTop: 24 }}>
      <h3>Propose an edit</h3>

      <div style={{ marginBottom: 8 }}>
        <label>
          Summary (optional)
          <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Short summary of the change" style={{ width: "100%" }} />
        </label>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>
          Edit body (Markdown supported)
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Proposed article body" required rows={10} style={{ width: "100%" }} />
        </label>
      </div>

      {error && <div style={{ color: "#b00020", marginBottom: 8 }>Error: {error}</div>}
      {success && <div style={{ color: "#007700", marginBottom: 8 }>{success}</div>}

      <div>
        <button type="submit" disabled={loading}>{loading ? "Submitting…" : "Submit Proposal"}</button>
      </div>
    </form>
  );
}
