import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import EditProposalForm from "../../../components/EditProposalForm";

// Use a loose prop signature to satisfy Next.js PageProps constraints in the app router
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function ArticleViewPage(props: any) {
  const slug = props?.params?.slug ?? "";

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

  // fetch recent edit proposals for this article
  const editsResp = await fetch(
    `${SUPABASE_URL}/rest/v1/article_edits?select=*&article_id=eq.${article.id}&order=created_at.desc`,
    {
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
      },
      next: { revalidate: 60 },
    }
  );
  let edits: Record<string, unknown>[] = [];
  if (editsResp.ok) {
    try {
      const editsRows = (await editsResp.json()) as Record<string, unknown>[] | Record<string, unknown>;
      edits = Array.isArray(editsRows) ? editsRows : [editsRows];
    } catch (err) {
      console.warn("Failed to parse edits response", err);
    }
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

      <section style={{ marginTop: 32 }}>
        <h2>Edit proposals</h2>
        {edits.length === 0 ? (
          <p>No edit proposals yet. Be the first to propose an improvement.</p>
        ) : (
          <ul>
            {edits.map((e) => (
              <li key={String(e.id ?? Math.random())} style={{ marginBottom: 12 }}>
                <div style={{ color: "#333", fontWeight: 600 }}>{String(e.summary ?? "(no summary)")}</div>
                <div style={{ color: "#666", fontSize: 12 }}>
                  By {String(e.author_fid ?? "unknown")} • {e.created_at ? new Date(String(e.created_at)).toLocaleString() : ""}
                </div>
                <div style={{ marginTop: 8 }}>
                  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{String(e.body ?? "")}</ReactMarkdown>
                </div>
                <div style={{ marginTop: 8 }}><em>Approved: {e.approved ? "Yes" : "No"}</em></div>
              </li>
            ))}
          </ul>
        )}

        {/* Client-side form to propose a new edit */}
        <EditProposalForm slug={article.slug} onSuccess={() => { /* no-op */ }} />
      </section>
    </div>
  );
}
