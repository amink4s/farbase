import type { NextApiRequest, NextApiResponse } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createQuickAuthClient, Errors } from "@farcaster/quick-auth";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !NEYNAR_API_KEY) {
  throw new Error("Missing required environment variables.");
}

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY);
const quickAuthClient = createQuickAuthClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { slug } = req.query;
  if (typeof slug !== "string") {
    return res.status(400).json({ error: "Invalid slug" });
  }

  const host = req.headers.host;
  if (!host) {
    return res.status(400).json({ error: "Missing host header" });
  }

  try {
    // 1. Verify QuickAuth JWT
    const payload = await quickAuthClient.verifyJwt({
      token: req.headers.authorization!.split(" ")[1],
      domain: host,
    });
    const likerFid = payload.sub;
    if (!likerFid) {
      return res.status(401).json({ error: "Could not determine user FID from token" });
    }

    // 2. Fetch liker's Neynar score
    const neynarResp = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${likerFid}`, {
      headers: { 'api_key': NEYNAR_API_KEY! },
    });
    if (!neynarResp.ok) throw new Error("Failed to fetch Neynar user data");
    const neynarData = await neynarResp.json();
    // This is a placeholder score logic
    const neynarScore = neynarData?.users?.[0]?.follower_count > 10 ? 0.6 : 0.4;

    // 3. Check if score is sufficient
    if (neynarScore <= 0.5) {
      return res.status(403).json({ error: "Neynar score too low to perform this action" });
    }

    // 4. Get article details
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id, author_fid")
      .eq("slug", slug)
      .single();

    if (articleError || !article) {
      return res.status(404).json({ error: "Article not found" });
    }

    // 5. Insert the like
    const { error: likeError } = await supabase
      .from("likes")
      .insert({ article_id: article.id, user_fid: likerFid });

    // If it's a duplicate like, the unique constraint will cause an error.
    // We can treat this as a success for the user (idempotent).
    if (likeError && likeError.code !== "23505") {
      console.error("Error inserting like:", likeError);
      throw likeError;
    }

    // Only award points if the like was new (no error)
    if (!likeError) {
      // 6. Award 1 point to the author
      const { error: pointsError } = await supabase
        .rpc("increment_user_points", { user_fid_to_update: article.author_fid, points_to_add: 1 });

      if (pointsError) {
        console.error(`Failed to award points: ${pointsError.message}`);
        // Non-critical, so we don't throw, but we log it.
      }

      // 7. Log the point transaction
      const { error: logError } = await supabase.from("point_logs").insert({
        user_fid: article.author_fid,
        points_awarded: 1,
        reason: "like_received",
        related_article_id: article.id,
        related_user_fid: likerFid,
      });

      if (logError) {
        console.error(`Failed to log points: ${logError.message}`);
        // Also non-critical.
      }
    }

    res.status(200).json({ success: true, message: "Article liked" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof Errors.InvalidTokenError) {
      return res.status(401).json({ error: "Invalid QuickAuth token" });
    }
    console.error("Like API error:", message);
    res.status(500).json({ error: "Internal server error", details: message });
  }
}
