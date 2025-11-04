import type { NextApiRequest, NextApiResponse } from "next";
import { Errors, createClient } from "@farcaster/quick-auth";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Keep import-time guard to surface missing env during startup in dev/CI.
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res
      .status(500)
      .json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Require QuickAuth token for admin access. Adjust as needed for your admin rules.
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

  // If ADMIN_FIDS is set (comma separated), only allow those FIDs to access this admin API.
  const adminFidsEnv = process.env.ADMIN_FIDS || process.env.ADMIN_FID;
  const requestFid =
    typeof payload === "object" && payload !== null && "sub" in payload
      ? String((payload as Record<string, unknown>).sub)
      : null;

  if (adminFidsEnv) {
    const allowed = adminFidsEnv.split(",").map((s) => s.trim()).filter(Boolean);
    if (!requestFid || !allowed.includes(requestFid)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }
  } else {
    // If no ADMIN_FIDS env is set, fall back to DB-backed admin allowlist: accounts.is_admin
    if (!requestFid) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    try {
      const accResp = await fetch(
        `${SUPABASE_URL}/rest/v1/accounts?select=is_admin&fid=eq.${encodeURIComponent(requestFid)}`,
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_KEY}`,
            apikey: SUPABASE_KEY,
            Prefer: "return=minimal",
          },
        }
      );

      if (!accResp.ok) {
        const text = await accResp.text();
        console.error("Supabase REST error fetching account:", accResp.status, text);
        return res.status(502).json({ error: "Supabase REST error", details: text });
      }

  const accRows = await accResp.json();
  const first = Array.isArray(accRows) && accRows.length > 0 ? (accRows[0] as { is_admin?: boolean }) : undefined;
  const isAdmin = Boolean(first?.is_admin);
      if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden: admin access required" });
      }
    } catch (err) {
      console.error("Error checking admin status:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const per_page = Math.min(1000, Math.max(1, parseInt(String(req.query.per_page ?? "50"), 10) || 50));
    const offset = (page - 1) * per_page;
    const event_type = req.query.event_type ? String(req.query.event_type) : undefined;

    // Build Supabase REST URL with optional filter
    const base = `${SUPABASE_URL}/rest/v1/webhook_events?select=*&order=received_at.desc&limit=${per_page}&offset=${offset}`;
    const url = event_type ? `${base}&event_type=eq.${encodeURIComponent(event_type)}` : base;

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
        Prefer: "count=exact",
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("Supabase REST error listing webhook_events:", resp.status, text);
      return res.status(502).json({ error: "Supabase REST error", details: text });
    }

    const events = await resp.json();

    // Try to parse total count from Content-Range header (format: 0-9/123)
    const contentRange = resp.headers.get("content-range");
    let total: number | undefined = undefined;
    if (contentRange) {
      const parts = contentRange.split("/");
      const last = parts[1];
      const n = parseInt(last, 10);
      if (Number.isFinite(n)) total = n;
    }

    return res.status(200).json({ events, page, per_page, total });
  } catch (err) {
    console.error("API /api/webhook_events error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
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
