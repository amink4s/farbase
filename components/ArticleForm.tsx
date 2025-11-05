"use client";
import React, { useState } from "react";
import sdk from "@farcaster/miniapp-sdk";

export default function ArticleForm({ onSuccess }: { onSuccess?: () => void }) {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingScore, setCheckingScore] = useState(false);
  const [neynarScore, setNeynarScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<"article" | "token">("article");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [autoSlug, setAutoSlug] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Client-side guard: if we have a Neynar score and it's too low, prevent submit.
    if (neynarScore !== null && neynarScore <= 0.7) {
      setError("Neynar score too low — you cannot publish until your score is above 0.7");
      setLoading(false);
      return;
    }

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

  async function handleCheckScore() {
    setCheckingScore(true);
    setError(null);
    try {
      let res: Response;
      const payload = { title, text: body };

      if (sdk && sdk.quickAuth && typeof sdk.quickAuth.fetch === "function") {
        res = await sdk.quickAuth.fetch("/api/neynar/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/neynar/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      const data = await res.json();
      setNeynarScore(typeof data?.score === "number" ? data.score : null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setNeynarScore(null);
    } finally {
      setCheckingScore(false);
    }
  }

  function makeSlug(s: string) {
    return s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\-\s]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function goNext() {
    if (step === 1) return setStep(2);
    if (step === 2) {
      // if auto slug enabled and title present, generate slug
      if (autoSlug && title) setSlug(makeSlug(title));
      return setStep(3);
    }
  }

  function goBack() {
    if (step === 3) return setStep(2);
    if (step === 2) return setStep(1);
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 800 }}>
      {step === 1 && (
        <div style={{ marginBottom: 12 }}>
          <h2>Choose category</h2>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="radio" name="category" checked={category === "article"} onChange={() => setCategory("article")} />
              Articles
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="radio" name="category" checked={category === "token"} onChange={() => setCategory("token")} />
              Tokens
            </label>
          </div>
          <div style={{ marginTop: 12 }}>
            <button type="button" onClick={goNext}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Settings</h2>

          <div style={{ marginBottom: 8 }}>
            <label>
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={category === "token" ? "Token / Project name" : "Article title"}
                required
                style={{ width: "100%" }}
              />
            </label>
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={autoSlug} onChange={(e) => setAutoSlug(e.target.checked)} />
              Auto-generate slug from title
            </label>
            <div style={{ marginTop: 6, color: "#666" }}>
              The slug is a short URL-friendly identifier used in the article URL (e.g. <code>/articles/your-slug</code>).
              It is auto-generated by default but you can edit it if you need custom URLs.
            </div>
          </div>

          {!autoSlug && (
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
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button type="button" onClick={goBack}>Back</button>
            <button type="button" onClick={goNext} disabled={!title}>Continue to article</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2>Write article</h2>
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
        </div>
      )}

      {error && (
        <div style={{ color: "#b00020", marginBottom: 8 }}>
          Error: {error}
        </div>
      )}

      {neynarScore !== null ? (
        <div style={{ marginBottom: 8 }}>
          Neynar score: <strong>{neynarScore.toFixed(3)}</strong> {neynarScore > 0.7 ? "(eligible)" : "(too low)"}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" onClick={handleCheckScore} disabled={checkingScore || step !== 3}>
          {checkingScore ? "Checking…" : "Check Neynar Score"}
        </button>

        <button
          type="submit"
          disabled={loading || step !== 3 || (neynarScore !== null && neynarScore <= 0.7)}
          title={neynarScore !== null && neynarScore <= 0.7 ? "Neynar score too low — check score and improve before publishing" : undefined}
        >
          {loading ? "Creating…" : "Create Article"}
        </button>
      </div>
    </form>
  );
}
