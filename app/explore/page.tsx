import React from 'react';

export const metadata = { title: 'Explore' };

export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Explore</h1>
      <p style={{ color: '#555', marginBottom: 18 }}>Browse curated article groups for the Farcaster / Base ecosystem.</p>

      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <a
          href="/explore/projects"
          style={{
            display: 'block',
            padding: '18px 28px',
            background: '#f6f8fa',
            borderRadius: 12,
            textDecoration: 'none',
            color: '#111',
            boxShadow: '0 6px 18px rgba(2,6,23,0.04)'
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Projects</div>
          <div style={{ color: '#666' }}>Curated project pages and profiles.</div>
        </a>

        <a
          href="/explore/tokens"
          style={{
            display: 'block',
            padding: '18px 28px',
            background: '#f6f8fa',
            borderRadius: 12,
            textDecoration: 'none',
            color: '#111',
            boxShadow: '0 6px 18px rgba(2,6,23,0.04)'
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Tokens</div>
          <div style={{ color: '#666' }}>Official token pages and token metadata articles.</div>
        </a>
      </div>
    </main>
  );
}
