import type { NextApiRequest, NextApiResponse } from "next";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type CountsResponse = { counts: Record<string, { likes: number; flags: number }> };

export default async function handler(req: NextApiRequest, res: NextApiResponse<CountsResponse | { error: string; details?: unknown }>) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const slugs = (req.body?.slugs as string[]) || [];
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return res.status(400).json({ error: "Body must include non-empty 'slugs' array" });
  }

  try {
    // Fetch article IDs for the given slugs
    const articlesUrl = `${SUPABASE_URL}/rest/v1/articles?select=id,slug&slug=in.(${slugs.map(s => encodeURIComponent(s)).join(',')})`;
    const articlesResp = await fetch(articlesUrl, { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } });
    if (!articlesResp.ok) {
      const text = await articlesResp.text();
      return res.status(502).json({ error: "Supabase REST error (articles)", details: text });
    }
    const articles: { id: number; slug: string }[] = await articlesResp.json();
    const articleIds = articles.map(a => a.id);
    const slugToId = new Map(articles.map(a => [a.slug, a.id]));

    // Fetch likes and flags counts grouped by article_id
    const [likesResp, flagsResp] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/likes?select=article_id&article_id=in.(${articleIds.join(',')})`, {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY }
      }),
      fetch(`${SUPABASE_URL}/rest/v1/flags?select=article_id&article_id=in.(${articleIds.join(',')})`, {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY }
      })
    ]);

    if (!likesResp.ok || !flagsResp.ok) {
      return res.status(502).json({ error: "Supabase REST error (likes/flags)" });
    }

    const likes: { article_id: number }[] = await likesResp.json();
    const flags: { article_id: number }[] = await flagsResp.json();

    // Count likes and flags per article_id
    const likeCounts = new Map<number, number>();
    const flagCounts = new Map<number, number>();
    for (const l of likes) {
      likeCounts.set(l.article_id, (likeCounts.get(l.article_id) || 0) + 1);
    }
    for (const f of flags) {
      flagCounts.set(f.article_id, (flagCounts.get(f.article_id) || 0) + 1);
    }

    // Build response mapping slug to counts
    const counts: CountsResponse["counts"] = {};
    for (const slug of slugs) {
      const articleId = slugToId.get(slug);
      counts[slug] = {
        likes: articleId ? (likeCounts.get(articleId) || 0) : 0,
        flags: articleId ? (flagCounts.get(articleId) || 0) : 0,
      };
    }
    return res.status(200).json({ counts });
  } catch (e) {
    console.error("counts API error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
