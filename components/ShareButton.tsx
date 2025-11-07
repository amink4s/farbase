"use client";

import React from "react";

interface ShareButtonProps {
  articleUrl: string;
  articleTitle: string;
}

export function ShareButton({ articleUrl, articleTitle }: ShareButtonProps) {
  const handleShare = () => {
    // The 'share' method might not be available, let's use a workaround
    // by creating a cast intent URL and opening it.
    const text = `Check out this article: ${articleTitle}`;
    const embedUrl = articleUrl;
    const castIntent = `https://warpcast.com/~/compose?text=${encodeURIComponent(
      text
    )}&embeds[]=${encodeURIComponent(embedUrl)}`;

    // Since we are in a mini app, we should open the link externally.
    if (typeof window !== "undefined") {
      window.open(castIntent, "_blank");
    }
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
