import type { NextApiRequest, NextApiResponse } from "next";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Intentional: allow import-time guard per repo conventions.
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  try {
    // We'll count up to a reasonable page size; for a larger dataset replace with a proper COUNT RPC.
    const qs = (cat: string) => `select=id&limit=1000&metadata->>category=eq.${encodeURIComponent(cat)}`;

    const [projResp, tokenResp] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/articles?${qs("article")}`, {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      }),
      fetch(`${SUPABASE_URL}/rest/v1/articles?${qs("token")}`, {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      }),
    ]);

    if (!projResp.ok || !tokenResp.ok) {
      const t1 = await projResp.text();
      const t2 = await tokenResp.text();
      console.error("Explore counts fetch error", t1, t2);
      return res.status(502).json({ error: "Supabase REST error", details: { proj: t1, token: t2 } });
    }

    const [projRows, tokenRows] = await Promise.all([projResp.json(), tokenResp.json()]);
    return res.status(200).json({ projects: Array.isArray(projRows) ? projRows.length : 0, tokens: Array.isArray(tokenRows) ? tokenRows.length : 0 });
  } catch (err) {
    console.error("/api/explore/counts error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
