import type { NextApiRequest, NextApiResponse } from "next";
import { Errors, createClient } from "@farcaster/quick-auth";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NEYNAR_KEY = process.env.NEYNAR_API_KEY;
// Neynar v2: user quality scores are returned in user object from bulk user fetch
const NEYNAR_URL = process.env.NEYNAR_API_URL || "https://api.neynar.com/v2/farcaster/user/bulk";
/**
 * Helper: fetch with retries for transient network errors or 5xx responses.
 * - Retries on network errors (e.g., DNS, ECONNREFUSED) and on 5xx responses.
 * - Does not retry on 4xx client errors.
 */
async function fetchWithRetries(url: string, init: RequestInit, maxAttempts = 3) {
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      const resp = await fetch(url, init);
      // If server error, consider retrying
      if (resp.status >= 500 && attempt < maxAttempts) {
        const backoff = Math.floor(200 * Math.pow(2, attempt) + Math.random() * 100);
        console.warn(`Neynar call got ${resp.status}; retrying attempt ${attempt}/${maxAttempts} after ${backoff}ms`);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      return resp;
    } catch (err: unknown) {
      // Network error: retry up to maxAttempts
      const isLast = attempt >= maxAttempts;
      const e = err as { message?: string; code?: string };
      const msg = e && e.message ? e.message : String(err);
      const code = e && e.code ? ` code=${e.code}` : "";
      console.warn(`Neynar fetch attempt ${attempt} failed: ${msg}${code}`);
      if (isLast) throw err;
      const backoff = Math.floor(200 * Math.pow(2, attempt) + Math.random() * 100);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

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
  // Support GET for search and POST for creation.
  if (req.method === "GET") {
    try {
      const q = (req.query.search as string) || "";
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : null;
      
      let url;
      if (!q && !limit) {
        return res.status(200).json({ articles: [] });
      } else if (!q && limit) {
        // Fetch recent articles
        url = `${SUPABASE_URL}/rest/v1/articles?select=slug,title,metadata,created_at,author_fid&order=created_at.desc&limit=${limit}`;
      } else {
        // Build Supabase REST filter: search in title, body, or slug (case-insensitive)
        const encoded = encodeURIComponent(`(title.ilike.*${q}*,body.ilike.*${q}*,slug.ilike.*${q}*)`);
        url = `${SUPABASE_URL}/rest/v1/articles?select=slug,title,metadata,created_at,author_fid&or=${encoded}&limit=50`;
      }

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
      return res.status(200).json({ articles: rows });
    } catch (err) {
      console.error("API /api/articles GET error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
  const { slug, title, body: content, metadata, category } = req.body ?? {};

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

    // Run Neynar moderation / scoring server-side before inserting.
    let neynar_score: number | null = null;
    if (!NEYNAR_KEY) {
      // If the Neynar key is not configured, fail fast: publishing is restricted until moderation is enabled.
      return res.status(503).json({ error: "Neynar moderation unavailable: missing NEYNAR_API_KEY" });
    }

    try {
      // Fetch user data from Neynar to get their quality score
      const nr = await fetchWithRetries(
        `${NEYNAR_URL}?fids=${authorFid}`,
        {
          method: "GET",
          headers: {
            "accept": "application/json",
            "x-api-key": NEYNAR_KEY,
            "x-neynar-experimental": "true",
          },
        },
        3
      );

      if (!nr.ok) {
        const text = await nr.text();
        console.warn("Neynar service returned non-OK status", nr.status, text);
        // Treat as service error
        return res.status(502).json({ error: "Neynar service error", details: text });
      }

      const nrJson = await nr.json();
      // Neynar v2 returns { users: [{ fid, username, ..., power_badge, ...}] }
      // User quality score is in the user object
      const users = nrJson?.users || [];
      const user = users.find((u: { fid: number }) => u.fid === parseInt(authorFid));
      
      // Log the full user object to identify the actual score field
      console.log("Neynar user response for FID", authorFid, ":", JSON.stringify(user, null, 2));
      
      if (user) {
        // Check for actual Neynar score field (multiple possible names)
        const explicitScore = user.score ?? user.neynar_score ?? user.quality_score ?? user.experimental_score ?? null;
        
        if (explicitScore !== null && typeof explicitScore === 'number') {
          neynar_score = explicitScore;
        } else {
          // Fallback: deny by default if no score field found
          console.warn("No score field found in Neynar response for FID", authorFid);
          neynar_score = 0;
        }
      } else {
        neynar_score = 0;
      }

      if (!Number.isFinite(neynar_score)) neynar_score = 0;
    } catch (err: unknown) {
      console.error("Error calling Neynar:", err);
      // Include underlying cause when available to aid debugging (e.g. ENOTFOUND)
      const e = err as { cause?: unknown };
      const cause = e && e.cause ? e.cause : err;
      const c = cause as { message?: string };
      const causeMsg = c && c.message ? c.message : String(cause);
      return res.status(502).json({ error: "Neynar call failed", details: causeMsg });
    }

    // Enforce quality gate: require Neynar score > 0.9 (strict threshold)
    if (neynar_score < 0.9) {
      return res.status(403).json({ error: "Neynar score too low", neynar_score });
    }

    // Create the article as visible but mark as not vetted. We keep articles public
    // per product decision — only awarding points after approval. The initial edit
    // proposal is created and must be approved to award contribution points.
    const insertPayload = {
      slug,
      title,
      body: content,
      author_fid: authorFid,
      metadata: { ...(metadata || {}), ...(category ? { category } : {}) },
      published: true,
      vetted: false,
      neynar_score,
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

    // Create an initial edit proposal for this submission. It will be stored in
    // `article_edits` with `approved=false`. When an approver accepts the edit
    // the article will be published and points awarded to the contributor.
    try {
      const editPayload = {
        article_id: inserted.id,
        author_fid: authorFid,
        body: content,
        summary: null,
        approved: false,
      };

      const editResp = await fetch(`${SUPABASE_URL}/rest/v1/article_edits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify(editPayload),
      });

      if (!editResp.ok) {
        const text = await editResp.text();
        // We return 201 for the created article but include a warning about the edit creation.
        return res.status(201).json({ article: inserted, warning: `Article created but edit proposal failed: ${text}` });
      }

      const editRows = await editResp.json();
      const createdEdit = Array.isArray(editRows) ? editRows[0] : editRows;
      return res.status(201).json({ article: inserted, proposal: createdEdit });
    } catch (err) {
      console.error("API /api/articles edit creation error:", err);
      // Return the article but note the edit creation failed.
      return res.status(201).json({ article: inserted, warning: "Article created but edit proposal failed" });
    }
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
