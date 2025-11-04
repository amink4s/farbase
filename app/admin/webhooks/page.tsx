import AdminWebhooks from "../../../components/AdminWebhooks";

export const metadata = {
  title: "Admin — Webhook Events",
};

import { headers } from "next/headers";
import { createClient } from "@farcaster/quick-auth";

type Hdr = { get(key: string): string | null };

function getUrlHostFromHeaders() {
  const h = headers() as unknown as Hdr;
  const origin = h.get("origin");
  if (origin) {
    try {
      const url = new URL(origin);
      return url.host;
    } catch {
      // ignore
    }
  }
  const host = h.get("host");
  if (host) return host;
  if (process.env.VERCEL_ENV === "production") return process.env.NEXT_PUBLIC_URL ?? "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "localhost:3000";
}

export default async function Page() {
  // Server-side guard: verify QuickAuth token (if provided) and require admin.
  const h = headers() as unknown as Hdr;
  const authorization = h.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return new Response("Forbidden", { status: 403 });
  }

  const token = authorization.split(" ")[1] as string;
  const client = createClient();
  try {
  const payload = await client.verifyJwt({ token, domain: getUrlHostFromHeaders() });
    const fid = typeof payload === "object" && payload && "sub" in payload ? String((payload as Record<string, unknown>).sub) : null;

    // If ADMIN_FIDS env set, check against it.
    const adminFidsEnv = process.env.ADMIN_FIDS || process.env.ADMIN_FID;
    if (adminFidsEnv) {
      const allowed = adminFidsEnv.split(",").map((s) => s.trim()).filter(Boolean);
      if (!fid || !allowed.includes(fid)) return new Response("Forbidden", { status: 403 });
    } else {
      // Otherwise check DB for is_admin flag via Supabase REST
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!SUPABASE_URL || !SUPABASE_KEY) return new Response("Forbidden", { status: 403 });

      const accResp = await fetch(`${SUPABASE_URL}/rest/v1/accounts?select=is_admin&fid=eq.${encodeURIComponent(fid ?? "")}`, {
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      });
      if (!accResp.ok) return new Response("Forbidden", { status: 403 });
      const rows = await accResp.json();
      const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined;
      if (!first || !first.is_admin) return new Response("Forbidden", { status: 403 });
    }
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin: Webhook Events</h1>
      <p style={{ marginTop: 0 }}>This page requires QuickAuth and admin access.</p>
      <AdminWebhooks />
    </main>
  );
}
