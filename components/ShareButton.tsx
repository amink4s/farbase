"use client";

import React from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";

interface ShareButtonProps {
  articleUrl: string;
  articleTitle: string;
}

export function ShareButton({ articleUrl, articleTitle }: ShareButtonProps) {
  const { share } = useMiniKit();

  const handleShare = () => {
    share({
      name: articleTitle,
      url: articleUrl,
    });
  };

  return (
    <button
      onClick={handleShare}
      style={{
        padding: "10px 18px",
        background: "var(--foreground)",
        color: "var(--background)",
        border: "none",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span>🔗</span> Share
    </button>
  );
}
