"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './ArticleSearch.module.css';

interface SearchResult {
  slug: string;
  title: string;
}

export function ArticleSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounced search effect
  useEffect(() => {
    const controller = new AbortController();
    if (!query || query.length < 2) {
      setResults([]);
      return () => controller.abort();
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/articles?search=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setResults(data.articles || []);
        } else {
          setResults([]);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error("Search error", err);
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Handle clicks outside the search component to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchRef]);

  const showResults = isFocused && (results.length > 0 || loading || query.length > 1);

  return (
    <div className={styles.searchContainer} ref={searchRef}>
      <input
        className={styles.searchInput}
        placeholder="Search tokens or projects"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        aria-label="Search Farpedia"
      />
      {showResults && (
        <div className={styles.resultsDropdown}>
          {loading && <div className={styles.loadingItem}>Searching...</div>}
          {!loading && results.length === 0 && query.length > 1 && (
            <div className={styles.noResultsItem}>{`No results found for "${query}"`}</div>
          )}
          {!loading && results.map((result) => (
            <Link key={result.slug} href={`/articles/${result.slug}`} className={styles.resultItem} onClick={() => setIsFocused(false)}>
              {result.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
