"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMiniKit, useQuickAuth } from "@coinbase/onchainkit/minikit";
import styles from "./page.module.css";
import { ArticleSearch } from '../components/ArticleSearch';

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

  type ArticleListItem = {
    slug: string;
    title: string;
    created_at: string;
    author_fid: string;
    author_username?: string;
    author_display_name?: string;
    author_pfp?: string;
    metadata?: { category?: string };
  };

  const [recentArticles, setRecentArticles] = useState<ArticleListItem[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<ArticleListItem[]>([]);
  const [counts, setCounts] = useState<Record<string, { likes: number; flags: number }>>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  // DELETED: Debounced search effect, now handled in ArticleSearch component
  // useEffect(() => { ... });

  // Fetch recent articles on mount
  useEffect(() => {
    async function fetchRecentArticles() {
      try {
        const res = await fetch('/api/articles?limit=5');
        const data = await res.json();
        if (data.articles && Array.isArray(data.articles)) {
          // Fetch author data from Neynar for each article
          const articlesWithAuthors = await Promise.all(
            data.articles.map(async (article: { author_fid: string; slug: string; title: string; created_at: string; metadata?: { category?: string } }) => {
              try {
                const neynarRes = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${article.author_fid}`, {
                  headers: { 'api_key': process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '' }
                });
                if (neynarRes.ok) {
                  const neynarData = await neynarRes.json();
                  const user = neynarData.users?.[0];
                  if (user) {
                    return {
                      ...article,
                      author_username: user.username,
                      author_display_name: user.display_name,
                      author_pfp: user.pfp_url,
                    };
                  }
                }
              } catch (err) {
                console.warn('Failed to fetch author data:', err);
              }
              return article;
            })
          );
          setRecentArticles(articlesWithAuthors);
        }
      } catch (err) {
        console.error('Failed to fetch recent articles:', err);
      }
    }
    fetchRecentArticles();
  }, []);

  // Fetch featured articles on mount
  useEffect(() => {
    async function fetchFeaturedArticles() {
      try {
        const res = await fetch('/api/articles?featured=true');
        const data = await res.json();
        if (data.articles && Array.isArray(data.articles)) {
          // Fetch author data from Neynar for each article
          const articlesWithAuthors = await Promise.all(
            data.articles.map(async (article: { author_fid: string; slug: string; title: string; created_at: string; metadata?: { category?: string } }) => {
              try {
                const neynarRes = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${article.author_fid}`, {
                  headers: { 'api_key': process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '' }
                });
                if (neynarRes.ok) {
                  const neynarData = await neynarRes.json();
                  const user = neynarData.users?.[0];
                  if (user) {
                    return {
                      ...article,
                      author_username: user.username,
                      author_display_name: user.display_name,
                      author_pfp: user.pfp_url,
                    };
                  }
                }
              } catch (err) {
                console.warn('Failed to fetch author data:', err);
              }
              return article;
            })
          );
          setFeaturedArticles(articlesWithAuthors);
        }
      } catch (err) {
        console.error('Failed to fetch featured articles:', err);
      }
    }
    fetchFeaturedArticles();
  }, []);

  // Fetch counts once we have either recent or featured articles
  useEffect(() => {
    const allSlugs = Array.from(new Set([...recentArticles, ...featuredArticles].map(a => a.slug)));
    if (allSlugs.length === 0) return;
    let cancelled = false;
    async function fetchCounts() {
      setIsLoadingCounts(true);
      try {
        const resp = await fetch('/api/articles/counts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slugs: allSlugs }),
        });
        if (resp.ok) {
          const json = await resp.json();
          if (!cancelled && json.counts) setCounts(json.counts);
        } else {
          console.warn('Failed to fetch article counts');
        }
      } catch (e) {
        console.warn('Counts fetch error', e);
      } finally {
        if (!cancelled) setIsLoadingCounts(false);
      }
    }
    fetchCounts();
    return () => { cancelled = true; };
  }, [recentArticles, featuredArticles]);

  const formatCounts = (slug: string) => {
    const c = counts[slug];
    if (!c) return isLoadingCounts ? '…' : '0';
    return `${c.likes ?? 0}👍 · ${c.flags ?? 0}🚩`;
  };

  return (
    <div className={styles.container}>
      <div style={{ padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Image src="/logo2.png" alt="Farpedia" className={styles.heroImage} width={320} height={120} priority />

        <div className={styles.pageActions} style={{ width: "100%", maxWidth: 760 }}>
          <div className={styles.searchWrapper}>
            <ArticleSearch />
          </div>

          <div>
            <Link href="/articles/create" className={styles.createButton} aria-label="Create article">
              +
            </Link>
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: 760, marginTop: 18 }}>
          {featuredArticles.length > 0 && (
            <div className={styles.articleSection}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>⭐ Featured</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {featuredArticles.map((article) => (
                  <Link 
                    key={article.slug} 
                    href={`/articles/${article.slug}`}
                    style={{
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 193, 7, 0.05))',
                      border: '2px solid rgba(255, 215, 0, 0.3)',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: 'var(--foreground)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.6)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 215, 0, 0.3)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      {article.author_pfp && (
                        <Image
                          src={article.author_pfp}
                          alt={article.author_display_name || 'Author'}
                          width={32}
                          height={32}
                          style={{ borderRadius: '50%', flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {article.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)' }}>
                          by {article.author_display_name || article.author_username || `FID ${article.author_fid}`} • {new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {article.metadata?.category && (
                        <span style={{
                          padding: '4px 8px',
                          background: article.metadata.category === 'token' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          color: article.metadata.category === 'token' ? 'rgb(139, 92, 246)' : 'rgb(59, 130, 246)',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          flexShrink: 0
                        }}>
                          {article.metadata.category === 'token' ? 'Token' : 'Project'}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text-secondary, #555)', fontWeight: 500 }}>
                        {formatCounts(article.slug)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {recentArticles.length > 0 && (
            <div className={styles.articleSection}>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Recent Articles</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentArticles.map((article) => (
                  <Link 
                    key={article.slug} 
                    href={`/articles/${article.slug}`}
                    style={{
                      padding: '12px 16px',
                      background: 'var(--card-bg, #fff)',
                      border: '1px solid var(--border-color, #e5e7eb)',
                      borderRadius: 8,
                      textDecoration: 'none',
                      color: 'var(--foreground)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      {article.author_pfp && (
                        <Image
                          src={article.author_pfp}
                          alt={article.author_display_name || 'Author'}
                          width={32}
                          height={32}
                          style={{ borderRadius: '50%', flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {article.title}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary, #666)' }}>
                          by {article.author_display_name || article.author_username || `FID ${article.author_fid}`} • {new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {article.metadata?.category && (
                        <span style={{
                          padding: '4px 8px',
                          background: article.metadata.category === 'token' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          color: article.metadata.category === 'token' ? 'rgb(139, 92, 246)' : 'rgb(59, 130, 246)',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          flexShrink: 0
                        }}>
                          {article.metadata.category === 'token' ? 'Token' : 'Project'}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text-secondary, #555)', fontWeight: 500 }}>
                        {formatCounts(article.slug)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
