"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMiniKit, useQuickAuth } from "@coinbase/onchainkit/minikit";
import styles from "./page.module.css";

export default function Home() {
  // Verify the user's identity and track them in the accounts table
  const { data: _authData } = useQuickAuth<{
    userFid: number;
  }>("/api/auth");

  const { setMiniAppReady, isMiniAppReady } = useMiniKit();

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [setMiniAppReady, isMiniAppReady]);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultsState, setResultsState] = useState<Array<{ slug: string; title: string }>>([]);
  const [recentArticles, setRecentArticles] = useState<Array<{ slug: string; title: string; created_at: string; metadata?: { category?: string } }>>([]);

  // Debounced search effect
  useEffect(() => {
    const controller = new AbortController();
    if (!query || query.length < 2) {
      setResultsState([]);
      return () => controller.abort();
    }

    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/articles?search=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) {
          setResultsState([]);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setResultsState(data.articles || []);
      } catch (err: unknown) {
        const name = typeof err === "object" && err !== null && "name" in err ? (err as { name?: unknown }).name : undefined;
        if (name !== "AbortError") {
          console.error("Search error", err);
        }
        setResultsState([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {

      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  // Fetch recent articles on mount
  useEffect(() => {
    fetch('/api/articles?limit=5')
      .then(res => res.json())
      .then(data => {
        if (data.articles) {
          setRecentArticles(data.articles);
        }
      })
      .catch(err => console.error('Failed to fetch recent articles:', err));
  }, []);

  return (
    <div className={styles.container}>
      <div style={{ padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Image src="/logo2.png" alt="Farpedia" className={styles.heroImage} width={320} height={120} priority />

        <div className={styles.pageActions} style={{ width: "100%", maxWidth: 760 }}>
          <div className={styles.searchWrapper}>
            <input
              className={styles.searchInput}
              placeholder="Search tokens or projects"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search farpedia"
              style={{ fontSize: "1.05rem", padding: "0.75rem 1rem" }}
            />
          </div>

          <div>
            <Link href="/articles/create" className={styles.createButton} aria-label="Create article">
              +
            </Link>
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: 760, marginTop: 18 }}>
          {query ? (
            <div>
              <h3>{`Search results for "${query}"`}</h3>
              {loading ? (
                <p>Searching…</p>
              ) : resultsState.length === 0 ? (
                <p>No results yet — try a different query.</p>
              ) : (
                <ul>
                  {resultsState.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/articles/${r.slug}`}>{r.title}</Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        {/* Recent Articles - shown when not searching */}
        {!query && recentArticles.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Recent Articles</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentArticles.map((article) => (
                <Link 
                  key={article.slug} 
                  href={`/articles/${article.slug}`}
                  style={{
                    padding: '16px 20px',
                    background: 'var(--card-bg, #fff)',
                    border: '1px solid var(--border-color, #e5e7eb)',
                    borderRadius: 8,
                    textDecoration: 'none',
                    color: 'var(--foreground)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--foreground)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color, #e5e7eb)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{article.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary, #666)' }}>
                      {new Date(article.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  {article.metadata?.category && (
                    <span style={{
                      padding: '4px 10px',
                      background: article.metadata.category === 'token' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                      color: article.metadata.category === 'token' ? 'rgb(139, 92, 246)' : 'rgb(59, 130, 246)',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      {article.metadata.category === 'token' ? 'Token' : 'Project'}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
