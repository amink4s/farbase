"use client";

import { useState } from "react";
import { useMiniKit } from "@coinbase/onchainkit/minikit";

interface LaunchButtonProps {
  href: string;
  title: string;
}

export function LaunchButton({ href, title }: LaunchButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const mini = useMiniKit();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Check if the link is a Farcaster Mini App link and if the function exists
    if (href.startsWith("https://miniapp.farcaster.xyz/") && mini && 'openMiniApp' in mini && typeof mini.openMiniApp === 'function') {
      e.preventDefault(); // Prevent default browser navigation
      mini.openMiniApp(href);
    }
    // For other links, or as a fallback, the default <a> tag behavior will apply (target="_blank")
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 24px',
        background: 'var(--foreground)',
        color: 'var(--background)',
        textDecoration: 'none',
        borderRadius: 8,
        fontSize: 15,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        transition: 'opacity 0.2s',
        marginTop: 4,
        opacity: isHovered ? 0.8 : 1,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      Launch {title}
    </a>
  );
}
