"use client";

import React, { useState } from "react";
import sdk from "@farcaster/miniapp-sdk";

interface LikeFlagButtonsProps {
  articleSlug: string;
  initialLikes: number;
  initialFlags: number;
}

export function LikeFlagButtons({ articleSlug, initialLikes, initialFlags }: LikeFlagButtonsProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [flags, setFlags] = useState(initialFlags);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: "like" | "flag") => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await sdk.quickAuth.fetch(`/api/articles/${articleSlug}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const { error: apiError } = await res.json();
        throw new Error(apiError || "An unknown error occurred.");
      }
      if (action === "like") setLikes((p) => p + 1);
      if (action === "flag") setFlags((p) => p + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <button
        onClick={() => handleAction("like")}
        disabled={isLoading}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
      >
        <span role="img" aria-label="like">👍</span>
        <span>{likes}</span>
      </button>
      <button
        onClick={() => handleAction("flag")}
        disabled={isLoading}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
      >
        <span role="img" aria-label="flag">🚩</span>
        <span>{flags}</span>
      </button>
      {error && <p style={{ color: "red", fontSize: 12, margin: 0 }}>{error}</p>}
    </div>
  );
}
