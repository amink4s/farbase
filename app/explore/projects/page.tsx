import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

type ArticleItem = {
  slug: string;
  title: string;
  metadata?: Record<string, unknown>;
  author_fid?: string;
  created_at?: string;
};

export const metadata = { title: 'Explore — Projects' };

export const dynamic = 'force-dynamic';

export default async function Page() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return <div style={{ padding: 24 }}>Missing Supabase configuration</div>;
  }

  // Filter articles where metadata->>'category' = 'article' (projects/general articles, not tokens)
  const url = `${SUPABASE_URL}/rest/v1/articles?select=slug,title,metadata,author_fid,created_at&metadata->>category=eq.article&order=created_at.desc&limit=200`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY }, next: { revalidate: 60 } });
  if (!resp.ok) {
    return <div style={{ padding: 24 }}>Failed to load projects list</div>;
  }
  const rows = await resp.json();
  const articles: ArticleItem[] = Array.isArray(rows) ? rows : [rows];

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Projects</h1>
      {articles.length === 0 ? (
        <p>No project articles found.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {articles.map((a) => (
            <article key={a.slug} style={{ flex: '1 1 260px', minWidth: 220, background: 'var(--card-bg, #fff)', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid var(--border-color, #e5e7eb)' }}>
              <a href={`/articles/${encodeURIComponent(a.slug)}`} style={{ fontWeight: 600, display: 'block', fontSize: 16, marginBottom: 8, color: 'var(--foreground)' }}>{a.title}</a>
              <div style={{ color: 'var(--text-secondary, #666)', fontSize: 13 }}>{a.author_fid} • {a.created_at ? new Date(String(a.created_at)).toLocaleString() : ''}</div>
              <div style={{ marginTop: 8, color: 'var(--foreground)' }}><ReactMarkdown rehypePlugins={[rehypeSanitize]}>{String((a.metadata as Record<string, unknown> | undefined)?.summary ?? '')}</ReactMarkdown></div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
