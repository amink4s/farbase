import type { NextApiRequest, NextApiResponse } from "next";
import { createClient, Errors } from "@farcaster/quick-auth";
import { getPointsConfig } from '../../../../_lib/points';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// NOTE: We intentionally avoid throwing at import time so the module is test-friendly.
// Handlers will validate required environment variables at runtime and return 500
// if the service is misconfigured.

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

    // Handle both string and number FID from JWT payload
    const maybe = payload as { sub?: string | number } | undefined;
    const actorFid = maybe && (typeof maybe.sub === "string" || typeof maybe.sub === "number") ? String(maybe.sub) : null;
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

    // Approval policy: article owner, admins, or reviewers may approve edits.
    // Check emergency ADMIN_FIDS env allowlist first, then fall back to DB lookup.
    const ADMIN_FIDS = process.env.ADMIN_FIDS || process.env.ADMIN_FID;
    let isAllowed = false;
    if (String(article.author_fid) === String(actorFid)) {
      isAllowed = true;
    } else if (ADMIN_FIDS) {
      const list = ADMIN_FIDS.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.includes(String(actorFid))) isAllowed = true;
    } else {
      // Query accounts for is_admin or is_reviewer
      try {
        const accResp = await fetch(`${SUPABASE_URL}/rest/v1/accounts?select=is_admin,is_reviewer&fid=eq.${encodeURIComponent(String(actorFid))}&limit=1`, {
          headers: { Authorization: `Bearer ${String(SUPABASE_KEY)}`, apikey: String(SUPABASE_KEY) } as Record<string, string>,
        });
        if (!accResp.ok) {
          const txt = await accResp.text();
          console.error("Supabase REST error fetching account:", accResp.status, txt);
        } else {
          const accRows = await accResp.json();
          const acct = Array.isArray(accRows) && accRows.length > 0 ? accRows[0] as { is_admin?: boolean; is_reviewer?: boolean } : undefined;
          if (acct && (acct.is_admin || acct.is_reviewer)) isAllowed = true;
        }
      } catch (e) {
        console.error("Error checking admin/reviewer status:", e);
      }
    }

    if (!isAllowed) {
      return res.status(403).json({ error: "Forbidden: only owner, admins or reviewers can approve edits" });
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

    // Decide points to award later: if the article was previously unpublished,
    // this approval represents the initial publication and should award more points.
    const wasPublished = Boolean(article.published);

    if (edit.body) articleUpdatePayload.body = edit.body;
    if (edit.title) articleUpdatePayload.title = edit.title;

    // If the article is not yet published, set published = true on approval.
    if (!wasPublished) {
      articleUpdatePayload.published = true;
      articleUpdatePayload.published_at = new Date().toISOString();
    }

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

    // After marking the edit approved, award contribution points to the edit author.
    try {
  // Determine points using configurable values
  const cfg = getPointsConfig();
  const awarded = wasPublished ? cfg.edit : cfg.initial;

      // Insert contributions ledger row
      const contribPayload = {
        fid: edit.author_fid,
        source_type: 'edit',
        source_id: edit.id,
        points: awarded,
        reason: wasPublished ? 'approved_edit' : 'initial_publication',
      };

      const contribResp = await fetch(`${SUPABASE_URL}/rest/v1/contributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
          Authorization: `Bearer ${String(SUPABASE_KEY)}`,
          apikey: String(SUPABASE_KEY),
        } as Record<string, string>,
        body: JSON.stringify(contribPayload),
      });

      if (!contribResp.ok) {
        const text = await contribResp.text();
        console.warn('Failed to insert contribution row:', text);
      }

      // Upsert aggregate points in user_points. We first try to fetch existing row,
      // then either patch (to increment) or insert.
      const fid = edit.author_fid;
      const existingResp = await fetch(`${SUPABASE_URL}/rest/v1/user_points?fid=eq.${encodeURIComponent(String(fid))}&limit=1`, {
        headers: { Authorization: `Bearer ${String(SUPABASE_KEY)}`, apikey: String(SUPABASE_KEY) } as Record<string, string>,
      });

      if (!existingResp.ok) {
        const text = await existingResp.text();
        console.warn('Failed to fetch user_points row:', text);
      } else {
        const existingRows = await existingResp.json();
        const existing = Array.isArray(existingRows) ? existingRows[0] : existingRows;

        if (existing) {
          // PATCH to increment total_points
          const newTotal = (Number(existing.total_points) || 0) + awarded;
          const patchResp = await fetch(`${SUPABASE_URL}/rest/v1/user_points?fid=eq.${encodeURIComponent(String(fid))}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
              Authorization: `Bearer ${String(SUPABASE_KEY)}`,
              apikey: String(SUPABASE_KEY),
            } as Record<string, string>,
            body: JSON.stringify({ total_points: newTotal, last_updated: new Date().toISOString() }),
          });
          if (!patchResp.ok) {
            const text = await patchResp.text();
            console.warn('Failed to patch user_points row:', text);
          }
        } else {
          // Insert new row
          const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/user_points`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
              Authorization: `Bearer ${String(SUPABASE_KEY)}`,
              apikey: String(SUPABASE_KEY),
            } as Record<string, string>,
            body: JSON.stringify({ fid, total_points: awarded }),
          });
          if (!insertResp.ok) {
            const text = await insertResp.text();
            console.warn('Failed to insert user_points row:', text);
          }
        }
      }
    } catch (e) {
      console.error('Error awarding points after approval:', e);
    }

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
