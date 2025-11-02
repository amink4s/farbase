import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

type Props = { params: { slug: string } };

export default async function ArticleViewPage({ params }: Props) {
  const slug = params?.slug ?? "";

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const url = `${SUPABASE_URL}/rest/v1/articles?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`;
  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
    // server-side rendering: revalidate every 60 seconds
    next: { revalidate: 60 },
  });

  if (!resp.ok) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Article: {slug}</h1>
        <p>Failed to load article.</p>
      </div>
    );
  }

  const rows = await resp.json();
  const article = Array.isArray(rows) ? rows[0] : rows;

  if (!article) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Article not found</h1>
        <p>{`No article with slug "${slug}" was found.`}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>{article.title}</h1>
      <div style={{ color: "#666", marginBottom: 12 }}>
        By {article.author_fid} • {new Date(article.created_at).toLocaleString()}
      </div>
      <article>
        <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{String(article.body)}</ReactMarkdown>
      </article>
    </div>
  );
}
