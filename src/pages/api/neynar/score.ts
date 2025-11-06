import type { NextApiRequest, NextApiResponse } from "next";
import { Errors, createClient } from "@farcaster/quick-auth";

const NEYNAR_KEY = process.env.NEYNAR_API_KEY;
// Neynar v2: user quality scores are returned in user object from bulk user fetch
const NEYNAR_URL = process.env.NEYNAR_API_URL || "https://api.neynar.com/v2/farcaster/user/bulk";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!NEYNAR_KEY) {
    return res.status(503).json({ error: "Neynar API key not configured" });
  }

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

  // Extract FID from verified token
  const fid =
    typeof payload === "object" && payload !== null && "sub" in payload
      ? String((payload as Record<string, unknown>).sub)
      : null;

  if (!fid) {
    return res.status(401).json({ error: "QuickAuth token missing sub (fid)" });
  }

  try {
    // Fetch user data from Neynar to get their quality score
    const nr = await fetch(`${NEYNAR_URL}?fids=${fid}`, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "x-api-key": NEYNAR_KEY,
      },
    });

    if (!nr.ok) {
      const textErr = await nr.text();
      console.warn("Neynar returned non-OK", nr.status, textErr);
      return res.status(502).json({ error: "Neynar service error", details: textErr });
    }

    const nrJson = await nr.json();
    // Neynar v2 returns { users: [{ fid, username, ..., power_badge, ...}] }
    const users = nrJson?.users || [];
    const user = users.find((u: { fid: number }) => u.fid === parseInt(fid));
    
    console.log("Neynar score check for FID", fid, ":", JSON.stringify(user, null, 2));
    
    let score = 0;
    if (user) {
      // Temporarily use a permissive scoring approach
      const hasPowerBadge = user.power_badge === true;
      const hasFollowers = (user.follower_count ?? 0) >= 10;
      const isActive = user.active_status === "active";
      
      if (hasPowerBadge) {
        score = 1.0;
      } else if (isActive && hasFollowers) {
        score = 0.9;
      } else if (hasFollowers) {
        score = 0.8;
      } else if (isActive) {
        score = 0.75;
      } else {
        score = 0.6;
      }
      // TODO: Replace with actual score field from Neynar response
    }

    return res.status(200).json({ score: Number.isFinite(score) ? score : 0, raw: nrJson });
  } catch (err) {
    console.error("Error calling Neynar:", err);
    return res.status(502).json({ error: "Neynar call failed" });
  }
}

function getUrlHost(req: NextApiRequest) {
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
