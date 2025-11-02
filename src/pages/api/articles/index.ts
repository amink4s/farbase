import type { NextApiRequest, NextApiResponse } from "next";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Note: this guard runs at import time so developers see a clear error during startup.
  // The handler below will also check and return a 500 if env is missing at runtime.
  // Do NOT commit secrets into source code.
  // TODO: ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel / Codespace env.
}

/**
 * POST /api/articles
 * Body expected: { slug, title, body, author_fid, metadata? }
 *
 * Server-side inserts use Supabase REST with the SERVICE_ROLE key.
 * TODO: Verify QuickAuth token from client (QuickAuth verification).
 * TODO: Call Neynar moderation API server-side to populate neynar_score before insert.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res
      .status(500)
      .json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { slug, title, body: content, author_fid, metadata } = req.body ?? {};

    if (!slug || !title || !content || !author_fid) {
      return res.status(400).json({ error: "Missing required fields: slug, title, body, author_fid" });
    }

    // TODO: QuickAuth server-side verification
    // Example: const quickAuthToken = req.headers.authorization?.split(" ")[1];
    // Verify the token with Farcaster QuickAuth server-side SDK / endpoint and ensure the fid matches author_fid.

    // TODO: Neynar moderation check
    // Example: call Neynar API with `content` and set `neynar_score` from response.

    const payload = {
      slug,
      title,
      body: content,
      author_fid,
      metadata: metadata || {},
      published: false
      // neynar_score: <set after Neynar check>
    };

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/articles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation", // return the inserted row
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: "Supabase REST error", details: text });
    }

    const rows = await resp.json();
    // Supabase returns an array of inserted rows when return=representation is used
    const inserted = Array.isArray(rows) ? rows[0] : rows;

    return res.status(201).json({ article: inserted });
  } catch (err) {
    console.error("API /api/articles error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
