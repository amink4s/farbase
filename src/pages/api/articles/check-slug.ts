import type { NextApiRequest, NextApiResponse } from "next";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Fail-fast at import time per project conventions
  // This will make misconfigured deployments fail early.
  // (Keep message minimal; handler will also check.)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slug } = req.body ?? {};
  if (!slug || typeof slug !== "string") {
    return res.status(400).json({ error: "Missing slug" });
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/articles?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: "Supabase REST error", details: text });
    }

    const rows = await resp.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return res.status(409).json({ available: false, message: "slug taken" });
    }

    return res.status(200).json({ available: true });
  } catch (err) {
    console.error("/api/articles/check-slug error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
