import type { NextApiRequest, NextApiResponse } from "next";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createQuickAuthClient, Errors } from "@farcaster/quick-auth";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
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

  try {
    // 1. Verify QuickAuth JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.split(" ")[1];

    // Determine domain from request host or Vercel env
    const domain = req.headers.host || process.env.VERCEL_URL || undefined;
    if (!domain) {
      return res.status(400).json({ error: "Missing host/VERCEL_URL" });
    }

    const payload = await quickAuthClient.verifyJwt({
      token,
      domain,
    });
    
    const flaggerFid = String(payload.sub);
    if (!flaggerFid) {
      return res.status(401).json({ error: "Could not determine user FID from token" });
    }

    // 2. Get article details
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id")
      .eq("slug", slug)
      .single();

    if (articleError || !article) {
      console.error("Article not found:", articleError);
      return res.status(404).json({ error: "Article not found" });
    }

    // 3. Insert the flag (idempotent)
    const { error: flagError } = await supabase
      .from("flags")
      .insert({ article_id: article.id, user_fid: flaggerFid });

    const isNewFlag = !flagError;
    if (flagError && flagError.code !== '23505') {
      console.error('Error inserting flag:', flagError);
      return res.status(500).json({ error: 'Failed to record flag', details: flagError.message });
    }

    if (isNewFlag) {
      // Increment stored flag_count atomically
      try {
        await supabase.rpc('increment_article_flag_count', { p_article_id: article.id });
      } catch (incErr) {
        console.warn('Failed to increment flag_count', incErr);
      }
      // Log point event (no points awarded for flag, but tracked for audit)
      try {
        await supabase.from('point_logs').insert({
          user_fid: flaggerFid,
          points_awarded: 0,
          reason: 'article_flagged',
          related_article_id: article.id,
          related_user_fid: flaggerFid,
        });
      } catch (logErr) {
        console.warn('Flag log failed (non-fatal)', logErr);
      }
    }

    return res.status(200).json({ success: true, message: isNewFlag ? 'Article flagged' : 'Already flagged' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof Errors.InvalidTokenError) {
      return res.status(401).json({ error: "Invalid QuickAuth token" });
    }
    console.error("Flag API error:", message);
    return res.status(500).json({ error: "Internal server error", details: message });
  }
}
