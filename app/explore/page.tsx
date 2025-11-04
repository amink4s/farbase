import React from 'react';

export const metadata = { title: 'Explore' };

export default function Page() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Explore</h1>
      <p>Browse curated article groups for the Farcaster / Base ecosystem.</p>
      <ul>
        <li><a href="/explore/projects">Projects</a></li>
        <li><a href="/explore/tokens">Tokens</a></li>
      </ul>
    </main>
  );
}
