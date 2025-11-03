import type { NextApiRequest, NextApiResponse } from "next";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Import-time guard to fail fast in server environments lacking secrets.
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { slug } = req.query as { slug?: string };
    if (!slug) {
      return res.status(400).json({ error: "Missing slug" });
    }

    const url = `${SUPABASE_URL}/rest/v1/articles?select=*&slug=eq.${encodeURIComponent(
      String(slug)
    )}&limit=1`;

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: "Supabase REST error", details: text });
    }

    const rows = await resp.json();
    const article = Array.isArray(rows) ? rows[0] : rows;
    if (!article) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.status(200).json({ article });
  } catch (err) {
    console.error("API /api/articles/[slug] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
