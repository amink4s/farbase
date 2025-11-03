"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import styles from "./page.module.css";

export default function Home() {
  // If you need to verify the user's identity, you can use the useQuickAuth hook.
  // This hook will verify the user's signature and return the user's FID. You can update
  // this to meet your needs. See the /app/api/auth/route.ts file for more details.
  // Note: If you don't need to verify the user's identity, you can get their FID and other user data
  // via `useMiniKit().context?.user`.
  // const { data, isLoading, error } = useQuickAuth<{
  //   userFid: string;
  // }>("/api/auth");

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
      <div className={styles.pageActions}>
        <div className={styles.searchWrapper}>
          <input
            className={styles.searchInput}
            placeholder="Search farpedia (tokens, projects, people...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search farpedia"
          />
        </div>

        <div>
          <Link href="/articles/create" className={styles.createButton}>
            + Publish
          </Link>
        </div>
      </div>

      <div className={styles.content}>
        <Image
          priority
          src="/sphere.svg"
          alt="Sphere"
          width={200}
          height={200}
        />
        <h1 className={styles.title}>MiniKit</h1>

        <p>
          Search the farpedia wiki or publish a new token/project page using the
          Publish button.
        </p>

        <div style={{ width: "100%", maxWidth: 800, marginTop: 20 }}>
          {query ? (
            <div>
              <h3>{`Search results for "${query}"`}</h3>
              {loading ? (
                <p>Searching…</p>
              ) : resultsState.length === 0 ? (
                <p>No results yet &mdash; try a different query.</p>
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

    <h2 className={styles.componentsTitle}>Explore Components</h2>

        <ul className={styles.components}>
          {[
            {
              name: "Transaction",
              url: "https://docs.base.org/onchainkit/transaction/transaction",
            },
            {
              name: "Swap",
              url: "https://docs.base.org/onchainkit/swap/swap",
            },
            {
              name: "Checkout",
              url: "https://docs.base.org/onchainkit/checkout/checkout",
            },
            {
              name: "Wallet",
              url: "https://docs.base.org/onchainkit/wallet/wallet",
            },
            {
              name: "Identity",
              url: "https://docs.base.org/onchainkit/identity/identity",
            },
          ].map((component) => (
            <li key={component.name}>
              <a target="_blank" rel="noreferrer" href={component.url}>
                {component.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
