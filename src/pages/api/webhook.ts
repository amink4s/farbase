import type { NextApiRequest, NextApiResponse } from "next";
import { Errors, createClient } from "@farcaster/quick-auth";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const client = createClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Basic logging for visibility in server logs
  console.info("/api/webhook received payload", { headers: req.headers, body: req.body });

  // Optional QuickAuth verification: if a Bearer token is provided, try to verify it.
  const authorization = req.headers.authorization as string | undefined;
  let verified = false;
  if (authorization && authorization.startsWith("Bearer ")) {
    const token = authorization.split(" ")[1] as string;
    try {
      await client.verifyJwt({ token, domain: getUrlHost(req) });
      verified = true;
    } catch (e) {
      if (e instanceof Errors.InvalidTokenError) {
        console.warn("Webhook: invalid QuickAuth token");
      } else {
        console.error("Webhook: QuickAuth verification error", e);
      }
    }
  }

  // If Supabase is configured, persist the webhook event to `webhook_events` table.
  let stored = false;
  let storedRow: unknown = null;
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const eventType = (req.headers["x-farcaster-event"] as string) || (req.headers["x-event-type"] as string) || "webhook";

      const insertPayload = {
        event_type: eventType,
        payload: req.body ?? {},
        headers: req.headers as Record<string, unknown>,
        verified,
      };

      const resp = await fetch(`${SUPABASE_URL}/rest/v1/webhook_events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify(insertPayload),
      });

      if (resp.ok) {
        stored = true;
        const rows = await resp.json();
        storedRow = Array.isArray(rows) ? rows[0] : rows;
      } else {
        const text = await resp.text();
        console.warn("Failed to persist webhook event to Supabase", resp.status, text);
      }
    } catch (err) {
      console.error("Error storing webhook event:", err);
    }
  }

  return res.status(200).json({ received: true, verified, stored, storedRow });
}

function getUrlHost(req: NextApiRequest) {
  // Try Origin header first
  const origin = req.headers.origin as string | undefined;
  if (origin) {
    try {
      const url = new URL(origin);
      return url.host;
    } catch (error) {
      console.warn("Invalid origin header:", origin, error);
    }
  }

  const host = req.headers.host as string | undefined;
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
