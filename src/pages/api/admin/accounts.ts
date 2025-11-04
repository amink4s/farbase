import type { NextApiRequest, NextApiResponse } from "next";
import { Errors, createClient } from "@farcaster/quick-auth";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res
      .status(500)
      .json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables" });
  }

  // Require QuickAuth and admin access (reuse same logic as webhook_events)
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

  // Check admin via env or DB
  const adminFidsEnv = process.env.ADMIN_FIDS || process.env.ADMIN_FID;
  const requestFid = typeof payload === "object" && payload !== null && "sub" in payload ? String((payload as Record<string, unknown>).sub) : null;

  if (adminFidsEnv) {
    const allowed = adminFidsEnv.split(",").map((s) => s.trim()).filter(Boolean);
    if (!requestFid || !allowed.includes(requestFid)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }
  } else {
    if (!requestFid) return res.status(403).json({ error: "Forbidden: admin access required" });
    try {
      const accResp = await fetch(
        `${SUPABASE_URL}/rest/v1/accounts?select=is_admin&fid=eq.${encodeURIComponent(requestFid)}`,
        { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY } }
      );
      if (!accResp.ok) {
        const text = await accResp.text();
        console.error("Supabase REST error fetching account:", accResp.status, text);
        return res.status(502).json({ error: "Supabase REST error", details: text });
      }
      const accRows = await accResp.json();
      const first = Array.isArray(accRows) && accRows.length > 0 ? (accRows[0] as { is_admin?: boolean }) : undefined;
      const isAdmin = Boolean(first?.is_admin);
      if (!isAdmin) return res.status(403).json({ error: "Forbidden: admin access required" });
    } catch (err) {
      console.error("Error checking admin status:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // GET -> list accounts
  if (req.method === "GET") {
    try {
      const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
      const per_page = Math.min(1000, Math.max(1, parseInt(String(req.query.per_page ?? "50"), 10) || 50));
      const offset = (page - 1) * per_page;

      const url = `${SUPABASE_URL}/rest/v1/accounts?select=fid,display_name,is_admin,created_at&order=created_at.desc&limit=${per_page}&offset=${offset}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY, Prefer: "count=exact" } });
      if (!resp.ok) {
        const text = await resp.text();
        return res.status(502).json({ error: "Supabase REST error", details: text });
      }
      const rows = await resp.json();
      const contentRange = resp.headers.get("content-range");
      let total: number | undefined = undefined;
      if (contentRange) {
        const parts = contentRange.split("/");
        const last = parts[1];
        const n = parseInt(last, 10);
        if (Number.isFinite(n)) total = n;
      }
      return res.status(200).json({ accounts: rows, page, per_page, total });
    } catch (err) {
      console.error("API /api/admin/accounts GET error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // PATCH -> update is_admin for a fid
  if (req.method === "PATCH") {
    try {
      const { fid, is_admin } = req.body ?? {};
      if (!fid || typeof is_admin !== "boolean") {
        return res.status(400).json({ error: "Missing fields: fid (string) and is_admin (boolean) are required" });
      }

      const resp = await fetch(`${SUPABASE_URL}/rest/v1/accounts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ fid, is_admin, display_name: null }),
      });

      if (!resp.ok && resp.status !== 201 && resp.status !== 204) {
        // Try upsert via PATCH on existing row
        const upResp = await fetch(`${SUPABASE_URL}/rest/v1/accounts?fid=eq.${encodeURIComponent(fid)}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ is_admin }),
        });
        if (!upResp.ok) {
          const text = await upResp.text();
          return res.status(502).json({ error: "Supabase REST error", details: text });
        }
        return res.status(200).json({ updated: true });
      }

      return res.status(200).json({ updated: true });
    } catch (err) {
      console.error("API /api/admin/accounts PATCH error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}

function getUrlHost(req: NextApiRequest) {
  const origin = req.headers.origin;
  if (origin) {
    try {
      const url = new URL(String(origin));
      return url.host;
    } catch (error) {
      console.warn("Invalid origin header:", origin, error);
    }
  }
  const host = req.headers.host;
  if (host) return host;
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
