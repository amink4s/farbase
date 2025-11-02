import type { NextApiRequest, NextApiResponse } from "next";
import { Errors, createClient } from "@farcaster/quick-auth";

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
    const { slug, title, body: content, metadata } = req.body ?? {};

    if (!slug || !title || !content) {
      return res.status(400).json({ error: "Missing required fields: slug, title, body" });
    }

    // QuickAuth server-side verification
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing QuickAuth token in Authorization header" });
    }

    const token = authorization.split(" ")[1] as string;
    const client = createClient();
    let payload: unknown;
    try {
      payload = await client.verifyJwt({ token, domain: getUrlHost(req) });
    } catch (e) {
      if (e instanceof Errors.InvalidTokenError) {
        return res.status(401).json({ error: "Invalid QuickAuth token" });
      }
      console.error("QuickAuth verify error:", e);
      return res.status(500).json({ error: "QuickAuth verification error" });
    }

    // Extract `sub` (the Farcaster FID) from the verified payload.
    const authorFid =
      typeof payload === "object" && payload !== null && "sub" in payload
        ? String((payload as Record<string, unknown>).sub)
        : null;

    if (!authorFid) {
      return res.status(401).json({ error: "QuickAuth token missing sub (fid)" });
    }

    // TODO: Neynar moderation check — call Neynar API with `content` and set `neynar_score` from response.

    const insertPayload = {
      slug,
      title,
      body: content,
      author_fid: authorFid,
      metadata: metadata || {},
      published: false,
    };

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/articles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation", // return the inserted row
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify(insertPayload),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: "Supabase REST error", details: text });
    }

    const rows = await resp.json();
    const inserted = Array.isArray(rows) ? rows[0] : rows;

    return res.status(201).json({ article: inserted });
  } catch (err) {
    console.error("API /api/articles error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

function getUrlHost(req: NextApiRequest) {
  // Try Origin header first
  const origin = req.headers.origin;
  if (origin) {
    try {
      const url = new URL(origin);
      return url.host;
    } catch (error) {
      console.warn("Invalid origin header:", origin, error);
    }
  }

  const host = req.headers.host;
  if (host) return host;

  // Fallback to environment-based host
  let urlValue: string;
  if (process.env.VERCEL_ENV === "production") {
    urlValue = process.env.NEXT_PUBLIC_URL!;
  } else if (process.env.VERCEL_URL) {
    urlValue = `https://${process.env.VERCEL_URL}`;
  } else {
    urlValue = "http://localhost:3000";
  }

  const url = new URL(urlValue);
  return url.host;
}
