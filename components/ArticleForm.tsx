"use client";
import React, { useState } from "react";
import sdk from "@farcaster/miniapp-sdk";

export default function ArticleForm({ onSuccess, onCategoryChange }: { onSuccess?: () => void; onCategoryChange?: (c: "article" | "token") => void }) {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingScore, setCheckingScore] = useState(false);
  const [neynarScore, setNeynarScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<"article" | "token">("article");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tokenAddress, setTokenAddress] = useState("");

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
  const payload = { slug, title, body, category, metadata: {} as Record<string, unknown> };
  if (category === "token" && tokenAddress) payload.metadata.tokenAddress = tokenAddress;
  // persist category in metadata for server-side queries
  payload.metadata.category = category;

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
      
      // Redirect to home page after successful creation
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      
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

  async function ensureUniqueSlug(): Promise<boolean> {
  const base = makeSlug(title || "");
    if (!base) {
      setError("Please provide a title to generate a slug");
      return false;
    }
    // try up to 5 variants
    for (let i = 0; i < 5; i++) {
      const candidate = i === 0 ? base : `${base}-${i}`;
      try {
        const res = await fetch("/api/articles/check-slug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: candidate }),
        });
        if (res.ok) {
          setSlug(candidate);
          return true;
        }
        if (res.status === 409) {
          // try next
          continue;
        }
        const text = await res.text();
        setError(`Slug check failed: ${text}`);
        return false;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Slug check error: ${message}`);
        return false;
      }
    }
    setError("Could not find an available slug — try a different title");
    return false;
  }

  function goNext() {
    if (step === 1) return setStep(2);
    if (step === 2) {
      // always generate slug from title
      if (title) setSlug(makeSlug(title));
      // ensure slug uniqueness before proceeding to write step
      ensureUniqueSlug().then((ok) => {
        if (ok) setStep(3);
      });
    }
  }

  function goBack() {
    if (step === 3) return setStep(2);
    if (step === 2) return setStep(1);
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 700, margin: '0 auto' }}>
      {step === 1 && (
        <div style={{ background: 'var(--card-bg)', padding: 24, borderRadius: 12, border: '1px solid var(--border-color)' }}>
          <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>Choose category</h2>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 10, 
                padding: '12px 20px', 
                background: category === "article" ? 'var(--foreground)' : 'transparent',
                color: category === "article" ? 'var(--background)' : 'var(--foreground)',
                border: '2px solid var(--border-color)',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 500,
                transition: 'all 0.2s'
              }}>
                <input 
                  type="radio" 
                  name="category" 
                  checked={category === "article"} 
                  onChange={() => { setCategory("article"); onCategoryChange?.("article"); }}
                  style={{ margin: 0 }}
                />
                Articles
              </label>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 10, 
                padding: '12px 20px', 
                background: category === "token" ? 'var(--foreground)' : 'transparent',
                color: category === "token" ? 'var(--background)' : 'var(--foreground)',
                border: '2px solid var(--border-color)',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 500,
                transition: 'all 0.2s'
              }}>
                <input 
                  type="radio" 
                  name="category" 
                  checked={category === "token"} 
                  onChange={() => { setCategory("token"); onCategoryChange?.("token"); }}
                  style={{ margin: 0 }}
                />
                Tokens
              </label>
          </div>
          <div>
            <button 
              type="button" 
              onClick={goNext}
              style={{
                padding: '12px 24px',
                background: 'var(--foreground)',
                color: 'var(--background)',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ background: 'var(--card-bg)', padding: 24, borderRadius: 12, border: '1px solid var(--border-color)' }}>
          <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>Settings</h2>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={category === "token" ? "Token / Project name" : "Article title"}
              required
              style={{ 
                width: "100%", 
                padding: '12px 16px',
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                borderRadius: 8,
                fontSize: 15,
                color: 'var(--foreground)'
              }}
            />
          </div>

          {category === "token" && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>
                Token contract address <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0x..."
                style={{ 
                  width: "100%", 
                  padding: '12px 16px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 8,
                  fontSize: 15,
                  color: 'var(--foreground)'
                }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              type="button" 
              onClick={goBack}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: 'var(--foreground)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ← Back
            </button>
            <button 
              type="button" 
              onClick={goNext} 
              disabled={!title}
              style={{
                padding: '12px 24px',
                background: title ? 'var(--foreground)' : 'var(--border-color)',
                color: title ? 'var(--background)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: title ? 'pointer' : 'not-allowed'
              }}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ background: 'var(--card-bg)', padding: 24, borderRadius: 12, border: '1px solid var(--border-color)' }}>
          <h2 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>Write your article</h2>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: 'var(--foreground)' }}>
              Content <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Markdown supported)</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your article content here..."
              required
              rows={14}
              style={{ 
                width: "100%", 
                padding: '12px 16px',
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                borderRadius: 8,
                fontSize: 15,
                color: 'var(--foreground)',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
          
          {error && (
            <div style={{ 
              color: '#ef4444', 
              marginBottom: 16, 
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              fontSize: 14
            }}>
              {error}
            </div>
          )}

          {neynarScore !== null && (
            <div style={{ 
              marginBottom: 16, 
              padding: '12px 16px',
              background: neynarScore > 0.9 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${neynarScore > 0.9 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: 8,
              fontSize: 14
            }}>
              Neynar score: <strong>{neynarScore.toFixed(3)}</strong> {neynarScore > 0.9 ? '✓ Eligible' : '✗ Score must be above 0.9'}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button 
              type="button" 
              onClick={handleCheckScore} 
              disabled={checkingScore || !body}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                color: 'var(--foreground)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: checkingScore || !body ? 'not-allowed' : 'pointer'
              }}
            >
              {checkingScore ? 'Checking…' : 'Check Score'}
            </button>

            <button
              type="submit"
              disabled={loading || (neynarScore !== null && neynarScore <= 0.9)}
              title={neynarScore !== null && neynarScore <= 0.9 ? "Your Neynar score must be above 0.9 to publish" : undefined}
              style={{
                padding: '12px 32px',
                background: (loading || (neynarScore !== null && neynarScore <= 0.9)) ? 'var(--border-color)' : 'var(--foreground)',
                color: (loading || (neynarScore !== null && neynarScore <= 0.9)) ? 'var(--text-secondary)' : 'var(--background)',
                border: 'none',
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: (loading || (neynarScore !== null && neynarScore <= 0.9)) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating…' : 'Publish Article'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
