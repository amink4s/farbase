"use client";
import React, { useState } from "react";
import sdk from "@farcaster/miniapp-sdk";

export default function ApproveEditButton({ slug, editId }: { slug: string; editId: string | number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      let res: Response;
      const path = `/api/articles/${encodeURIComponent(slug)}/edits/${encodeURIComponent(String(editId))}/approve`;
      if (sdk && sdk.quickAuth && typeof sdk.quickAuth.fetch === "function") {
        res = await sdk.quickAuth.fetch(path, { method: "POST" });
      } else {
        res = await fetch(path, { method: "POST" });
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      // On success, reload to show updated state (approved edit). Could be optimized to avoid reload.
      window.location.reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "inline-block", marginLeft: 12 }}>
      <button onClick={handleApprove} disabled={loading} style={{ marginRight: 8 }}>
        {loading ? "Approving…" : "Approve"}
      </button>
      {error && <div style={{ color: "#b00020", marginTop: 4 }}>{error}</div>}
    </div>
  );
}
