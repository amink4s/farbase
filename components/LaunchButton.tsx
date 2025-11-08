"use client";

import { useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

interface LaunchButtonProps {
  href: string;
  title: string;
}

export function LaunchButton({ href, title }: LaunchButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // Prevent default browser navigation
    
    try {
      // Use the Farcaster SDK to open the Mini App
      // This works with any URL - if it's a Mini App, it will open as a Mini App
      await sdk.actions.openMiniApp({ url: href });
      // Navigation successful - current app will close
    } catch (error) {
      console.error('Failed to open Mini App:', error);
      // Fallback to opening in a new tab if openMiniApp fails
      window.open(href, '_blank', 'noopener,noreferrer');
    }
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
