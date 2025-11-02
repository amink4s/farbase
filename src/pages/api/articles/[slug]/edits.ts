import type { NextApiRequest, NextApiResponse } from "next";
import { Errors, createClient } from "@farcaster/quick-auth";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const quickAuthClient = createClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const { slug } = req.query as { slug?: string };
  if (!slug) {
    return res.status(400).json({ error: "Missing slug" });
  }

  // GET: list edits for an article
  if (req.method === "GET") {
    try {
      // two-step query: fetch article id by slug, then fetch edits

      // Supabase REST doesn't support nested select like that; do a two-step query
      // 1) fetch article id by slug
      const artResp = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=id&slug=eq.${encodeURIComponent(String(slug))}&limit=1`, {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      });
      if (!artResp.ok) {
        const text = await artResp.text();
        return res.status(502).json({ error: "Supabase REST error", details: text });
      }
      const artRows = await artResp.json();
      const article = Array.isArray(artRows) ? artRows[0] : artRows;
      if (!article) return res.status(404).json({ error: "Article not found" });

      const editsResp = await fetch(`${SUPABASE_URL}/rest/v1/article_edits?select=*&article_id=eq.${article.id}&order=created_at.desc`, {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      });
      if (!editsResp.ok) {
        const text = await editsResp.text();
        return res.status(502).json({ error: "Supabase REST error", details: text });
      }
      const edits = await editsResp.json();
      return res.status(200).json({ edits });
    } catch (err) {
      console.error("API /api/articles/[slug]/edits GET error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // POST: propose an edit (requires QuickAuth token)
  if (req.method === "POST") {
    try {
      const { body, summary } = req.body ?? {};
      if (!body) return res.status(400).json({ error: "Missing body" });

      // verify QuickAuth token
      const authorization = req.headers.authorization;
      if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing QuickAuth token" });
      }
      const token = authorization.split(" ")[1] as string;
      let payload: unknown;
      try {
        payload = await quickAuthClient.verifyJwt({ token, domain: getUrlHost(req) });
      } catch (e) {
        if (e instanceof Errors.InvalidTokenError) return res.status(401).json({ error: "Invalid QuickAuth token" });
        console.error("QuickAuth verify error:", e);
        return res.status(500).json({ error: "QuickAuth verification error" });
      }
    const maybe = payload as { sub?: string } | undefined;
    const authorFid = maybe && typeof maybe.sub === "string" ? maybe.sub : null;
      if (!authorFid) return res.status(401).json({ error: "QuickAuth token missing sub (fid)" });

      // fetch article id
      const artResp = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=id&slug=eq.${encodeURIComponent(String(slug))}&limit=1`, {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      });
      if (!artResp.ok) {
        const text = await artResp.text();
        return res.status(502).json({ error: "Supabase REST error", details: text });
      }
      const artRows = await artResp.json();
      const article = Array.isArray(artRows) ? artRows[0] : artRows;
      if (!article) return res.status(404).json({ error: "Article not found" });

      const payloadToInsert = {
        article_id: article.id,
        author_fid: authorFid,
        body,
        summary: summary || null,
        approved: false,
      };

      const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/article_edits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify(payloadToInsert),
      });
      if (!insertResp.ok) {
        const text = await insertResp.text();
        return res.status(502).json({ error: "Supabase REST error", details: text });
      }
      const inserted = await insertResp.json();
      return res.status(201).json({ edit: Array.isArray(inserted) ? inserted[0] : inserted });
    } catch (err) {
      console.error("API /api/articles/[slug]/edits POST error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}

function getUrlHost(req: NextApiRequest) {
  const origin = req.headers.origin;
  if (origin) {
    try {
      const url = new URL(origin);
      return url.host;
    } catch (e) {
      console.warn("Invalid origin header:", origin, e);
    }
  }
  const host = req.headers.host;
  if (host) {
    return host;
  }

  // Final fallback to environment variables
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
