import type { NextApiRequest, NextApiResponse } from "next";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Import-time guard per repo convention; runtime will also validate
}

type CountsResponse = {
  counts: Record<string, { likes: number; flags: number }>; // keyed by slug
};

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
    // 1) Fetch article ids for provided slugs
    const articlesResp = await fetch(
      `${SUPABASE_URL}/rest/v1/articles?select=id,slug&slug=in.(${slugs.map((s) => encodeURIComponent(s)).join(",")})`,
      { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } }
    );
    if (!articlesResp.ok) {
      const text = await articlesResp.text();
      return res.status(502).json({ error: "Supabase REST error (articles)", details: text });
    }
    const articles: { id: string; slug: string }[] = await articlesResp.json();
    const idBySlug = new Map(articles.map((a) => [a.slug, a.id]));
    const ids = articles.map((a) => a.id);

    const counts: CountsResponse["counts"] = Object.fromEntries(slugs.map((s) => [s, { likes: 0, flags: 0 }]));
    if (ids.length === 0) return res.status(200).json({ counts });

    const idsList = ids.map((id) => encodeURIComponent(id)).join(",");

    // 2) Fetch likes rows for these article ids (aggregate in app)
    const likesResp = await fetch(
      `${SUPABASE_URL}/rest/v1/likes?select=article_id&article_id=in.(${idsList})&limit=10000`,
      { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } }
    );
    if (!likesResp.ok) {
      const text = await likesResp.text();
      return res.status(502).json({ error: "Supabase REST error (likes)", details: text });
    }
    const likesRows: { article_id: string }[] = await likesResp.json();

    // 3) Fetch flags rows for these article ids
    const flagsResp = await fetch(
      `${SUPABASE_URL}/rest/v1/flags?select=article_id&article_id=in.(${idsList})&limit=10000`,
      { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } }
    );
    if (!flagsResp.ok) {
      const text = await flagsResp.text();
      return res.status(502).json({ error: "Supabase REST error (flags)", details: text });
    }
    const flagsRows: { article_id: string }[] = await flagsResp.json();

    // 4) Aggregate by slug
    const slugById = new Map<string, string>();
    for (const [slug, id] of idBySlug.entries()) slugById.set(id, slug);

    for (const r of likesRows) {
      const slug = slugById.get(r.article_id);
      if (slug) counts[slug].likes += 1;
    }
    for (const r of flagsRows) {
      const slug = slugById.get(r.article_id);
      if (slug) counts[slug].flags += 1;
    }

    return res.status(200).json({ counts });
  } catch (err) {
    console.error("/api/articles/counts error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
