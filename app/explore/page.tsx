"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

function IconProjects() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#2563eb" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#7c3aed" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#06b6d4" />
    </svg>
  );
}

function IconTokens() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" fill="#f97316" />
      <rect x="6" y="14" width="12" height="6" rx="2" fill="#f59e0b" />
    </svg>
  );
}

export default function Page() {
  const [counts, setCounts] = useState<{ projects: number; tokens: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/explore/counts')
      .then((r) => r.json())
      .then((d) => {
        if (mounted) setCounts(d);
      })
      .catch((e) => console.warn('Failed to load explore counts', e));
    return () => {
      mounted = false;
    };
  }, []);

  async function trackClick(category: 'projects' | 'tokens') {
    try {
      await fetch('/api/analytics/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'explore.click', payload: { category } }) });
    } catch (e) {
      console.warn('analytics failed', e);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Link 
        href="/" 
        style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          background: 'var(--foreground)',
          color: 'var(--background)',
          textDecoration: 'none',
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 20,
          transition: 'opacity 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
      >
        ← Home
      </Link>
      <h1 style={{ marginBottom: 8, marginTop: 16, fontSize: 28, fontWeight: 700 }}>Explore</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20 }}>
        <a
          href="/explore/projects"
          onClick={() => trackClick('projects')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '20px',
            background: '#fff',
            borderRadius: 12,
            textDecoration: 'none',
            color: '#111',
            boxShadow: '0 6px 18px rgba(2,6,23,0.04)',
            transition: 'transform 180ms ease, box-shadow 180ms ease',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = 'none')}
        >
          <IconProjects />
          <div style={{ fontSize: 16, fontWeight: 700 }}>Projects</div>
          <div style={{ color: '#666', fontSize: 13 }}>{counts ? `${counts.projects} items` : '—'}</div>
        </a>

        <a
          href="/explore/tokens"
          onClick={() => trackClick('tokens')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '20px',
            background: '#fff',
            borderRadius: 12,
            textDecoration: 'none',
            color: '#111',
            boxShadow: '0 6px 18px rgba(2,6,23,0.04)',
            transition: 'transform 180ms ease, box-shadow 180ms ease',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = 'none')}
        >
          <IconTokens />
          <div style={{ fontSize: 16, fontWeight: 700 }}>Tokens</div>
          <div style={{ color: '#666', fontSize: 13 }}>{counts ? `${counts.tokens} items` : '—'}</div>
        </a>
      </div>
    </main>
  );
}
