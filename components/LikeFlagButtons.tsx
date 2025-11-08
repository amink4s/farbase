"use client";

import { useState, useEffect } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { createClient } from "@supabase/supabase-js";

interface LikeFlagButtonsProps {
  articleSlug: string;
  initialLikes: number;
  initialFlags: number;
}

// This is a public-facing client component, so we use the anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function LikeFlagButtons({
  articleSlug,
  initialLikes,
  initialFlags,
}: LikeFlagButtonsProps) {
  const { sdk, context } = useMiniKit();
  const [likes, setLikes] = useState(initialLikes);
  const [flags, setFlags] = useState(initialFlags);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [userHasFlagged, setUserHasFlagged] = useState(false);

  const userFid = context?.user?.fid;

  useEffect(() => {
    // Check if the user has already liked or flagged this article
    const checkUserActions = async () => {
      if (!userFid) return;

      const { data: article, error: articleError } = await supabase
        .from("articles")
        .select("id")
        .eq("slug", articleSlug)
        .single();

      if (articleError || !article) return;

      const [likeRes, flagRes] = await Promise.all([
        supabase
          .from("likes")
          .select("id")
          .eq("article_id", article.id)
          .eq("user_fid", userFid)
          .limit(1),
        supabase
          .from("flags")
          .select("id")
          .eq("article_id", article.id)
          .eq("user_fid", userFid)
          .limit(1),
      ]);

      if (likeRes.data && likeRes.data.length > 0) {
        setUserHasLiked(true);
      }
      if (flagRes.data && flagRes.data.length > 0) {
        setUserHasFlagged(true);
      }
    };

    checkUserActions();
  }, [userFid, articleSlug]);

  const handleAction = async (action: "like" | "flag") => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await sdk.quickAuth.fetch(
        `/api/articles/${articleSlug}/${action}`,
        { method: "POST" }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "An unknown error occurred");
      }

      if (action === "like") {
        setLikes((prev) => prev + 1);
        setUserHasLiked(true);
      } else {
        setFlags((prev) => prev + 1);
        setUserHasFlagged(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to perform action");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <button
        onClick={() => handleAction("like")}
        disabled={isLoading || userHasLiked}
        style={{
          background: userHasLiked ? "var(--accent-color-secondary)" : "var(--card-bg)",
          color: "var(--foreground)",
          border: "1px solid var(--border-color)",
          borderRadius: 8,
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: isLoading || userHasLiked ? "not-allowed" : "pointer",
          opacity: isLoading || userHasLiked ? 0.6 : 1,
        }}
      >
        <span>👍</span>
        <span>{likes}</span>
      </button>
      <button
        onClick={() => handleAction("flag")}
        disabled={isLoading || userHasFlagged}
        style={{
          background: userHasFlagged ? "var(--accent-color-secondary)" : "var(--card-bg)",
          color: "var(--foreground)",
          border: "1px solid var(--border-color)",
          borderRadius: 8,
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: isLoading || userHasFlagged ? "not-allowed" : "pointer",
          opacity: isLoading || userHasFlagged ? 0.6 : 1,
        }}
      >
        <span>🚩</span>
        <span>{flags}</span>
      </button>
      {error && <div style={{ color: "red", fontSize: 12 }}>{error}</div>}
    </div>
  );
}
