import type { NextApiRequest, NextApiResponse } from "next";
import { createClient, Errors } from "@farcaster/quick-auth";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const quickAuthClient = createClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slug, id } = req.query as { slug?: string; id?: string };
  if (!slug || !id) return res.status(400).json({ error: "Missing slug or id" });

  // Verify QuickAuth token
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
  const actorFid = maybe && typeof maybe.sub === "string" ? maybe.sub : null;
  if (!actorFid) return res.status(401).json({ error: "QuickAuth token missing sub (fid)" });

  try {
    // Fetch article to confirm owner
    const artResp = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=*&slug=eq.${encodeURIComponent(String(slug))}&limit=1`, {
      headers: { Authorization: `Bearer ${String(SUPABASE_KEY)}`, apikey: String(SUPABASE_KEY) } as Record<string, string>,
    });
    if (!artResp.ok) {
      const text = await artResp.text();
      return res.status(502).json({ error: "Supabase REST error", details: text });
    }
    const artRows = await artResp.json();
    const article = Array.isArray(artRows) ? artRows[0] : artRows;
    if (!article) return res.status(404).json({ error: "Article not found" });

    // Only the article owner (author_fid) can approve edits
    if (String(article.author_fid) !== String(actorFid)) {
      return res.status(403).json({ error: "Only the article owner can approve edits" });
    }

    // Fetch the edit row so we can apply it to the article
    const editResp = await fetch(`${SUPABASE_URL}/rest/v1/article_edits?id=eq.${encodeURIComponent(String(id))}&limit=1`, {
      headers: { Authorization: `Bearer ${String(SUPABASE_KEY)}`, apikey: String(SUPABASE_KEY) } as Record<string, string>,
    });
    if (!editResp.ok) {
      const text = await editResp.text();
      return res.status(502).json({ error: "Supabase REST error fetching edit", details: text });
    }
    const editRows = await editResp.json();
    const edit = Array.isArray(editRows) ? editRows[0] : editRows;
    if (!edit) return res.status(404).json({ error: "Edit not found" });

    // Apply the edit to the article: update the article's body (and title if provided)
    const articleUpdatePayload: Record<string, unknown> = {};
    if (edit.body) articleUpdatePayload.body = edit.body;
    if (edit.title) articleUpdatePayload.title = edit.title;

    if (Object.keys(articleUpdatePayload).length > 0) {
      const applyResp = await fetch(`${SUPABASE_URL}/rest/v1/articles?id=eq.${encodeURIComponent(String(article.id))}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
          Authorization: `Bearer ${String(SUPABASE_KEY)}`,
          apikey: String(SUPABASE_KEY),
        } as Record<string, string>,
        body: JSON.stringify(articleUpdatePayload),
      });

      if (!applyResp.ok) {
        const text = await applyResp.text();
        return res.status(502).json({ error: "Supabase REST error applying edit to article", details: text });
      }
    }

    // Finally mark the edit as approved
    const updateResp = await fetch(`${SUPABASE_URL}/rest/v1/article_edits?id=eq.${encodeURIComponent(String(id))}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
        Authorization: `Bearer ${String(SUPABASE_KEY)}`,
        apikey: String(SUPABASE_KEY),
      } as Record<string, string>,
      body: JSON.stringify({ approved: true }),
    });

    if (!updateResp.ok) {
      const text = await updateResp.text();
      return res.status(502).json({ error: "Supabase REST error updating edit", details: text });
    }

    const updated = await updateResp.json();
    return res.status(200).json({ applied: true, updated: Array.isArray(updated) ? updated[0] : updated });
  } catch (err) {
    console.error("API approve edit error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
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
  if (host) return host;
  if (process.env.VERCEL_ENV === "production") return process.env.NEXT_PUBLIC_URL!;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
