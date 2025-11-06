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
      </div>
    </div>
  );
}
