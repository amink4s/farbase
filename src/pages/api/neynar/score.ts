import type { NextApiRequest, NextApiResponse } from "next";
import { Errors, createClient } from "@farcaster/quick-auth";

const NEYNAR_KEY = process.env.NEYNAR_API_KEY;
// Default to the documented Neynar base URL (use .com, not .ai)
const NEYNAR_URL = process.env.NEYNAR_API_URL || "https://api.neynar.com/v1/score";

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
  try {
    await client.verifyJwt({ token, domain: getUrlHost(req) });
  } catch (e) {
    if (e instanceof Errors.InvalidTokenError) {
      return res.status(401).json({ error: "Invalid QuickAuth token" });
    }
    console.error("QuickAuth verify error:", e);
    return res.status(500).json({ error: "QuickAuth verification error" });
  }

  const { title, text } = req.body ?? {};
  if (!text && !title) {
    return res.status(400).json({ error: "Missing title or text for scoring" });
  }

  try {
    const nr = await fetch(NEYNAR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NEYNAR_KEY}`,
      },
      body: JSON.stringify({ title, text }),
    });

    if (!nr.ok) {
      const textErr = await nr.text();
      console.warn("Neynar returned non-OK", nr.status, textErr);
      return res.status(502).json({ error: "Neynar service error", details: textErr });
    }

    const nrJson = await nr.json();
    const maybeScore = typeof nrJson === "object" && nrJson !== null
      ? (nrJson.score ?? nrJson.neynar_score ?? nrJson.data?.score ?? nrJson.result?.score)
      : undefined;

    const score = typeof maybeScore === "number" ? maybeScore : parseFloat(String(maybeScore ?? "NaN"));
    return res.status(200).json({ score: Number.isFinite(score) ? score : null, raw: nrJson });
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
