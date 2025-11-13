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
    // Attempt to use stored counts columns first
    const url = `${SUPABASE_URL}/rest/v1/articles?select=slug,like_count,flag_count&slug=in.(${slugs.map(s => encodeURIComponent(s)).join(',')})`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } });
    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: "Supabase REST error (articles)", details: text });
    }
    const rows: { slug: string; like_count?: number; flag_count?: number }[] = await resp.json();
    const counts: CountsResponse["counts"] = Object.fromEntries(slugs.map(s => [s, { likes: 0, flags: 0 }]));
    for (const r of rows) {
      counts[r.slug] = { likes: r.like_count || 0, flags: r.flag_count || 0 };
    }
    return res.status(200).json({ counts });
  } catch (e) {
    console.error("counts API error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
