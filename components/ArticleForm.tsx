"use client";
import React, { useState } from "react";
import sdk from "@farcaster/miniapp-sdk";

export default function ArticleForm({ onSuccess }: { onSuccess?: () => void }) {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Server will verify QuickAuth JWT and set `author_fid` from the token's `sub`.
    const payload = { slug, title, body };

    try {
      let res: Response;

      // If running inside a mini app, use the miniapp SDK quickAuth.fetch so the
      // Authorization header is attached by the host. Otherwise fall back to normal fetch.
      if (sdk && sdk.quickAuth && typeof sdk.quickAuth.fetch === "function") {
        res = await sdk.quickAuth.fetch("/api/articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/articles", {
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
      setLoading(false);
      setSlug("");
      setTitle("");
      setBody("");
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 800 }}>
      <div style={{ marginBottom: 8 }}>
        <label>
          Slug
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="unique-slug"
            required
            style={{ width: "100%" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title"
            required
            style={{ width: "100%" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label>
          Body
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Article content (Markdown supported)"
            required
            rows={12}
            style={{ width: "100%" }}
          />
        </label>
      </div>

      {error && (
        <div style={{ color: "#b00020", marginBottom: 8 }}>
          Error: {error}
        </div>
      )}

      <div>
        <button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create Article"}
        </button>
      </div>
    </form>
  );
}
