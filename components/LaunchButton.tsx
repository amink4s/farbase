"use client";

import { useState } from "react";

interface LaunchButtonProps {
  href: string;
  title: string;
}

export function LaunchButton({ href, title }: LaunchButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
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
      🚀 Launch {title}
    </a>
  );
}
