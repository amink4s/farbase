"use client";
import React, { useEffect, useState } from 'react';
import { useMiniKit, useQuickAuth } from '@coinbase/onchainkit/minikit';

type Contribution = {
  id?: number;
  source_type?: string;
  source_id?: string | number;
  points?: number;
  reason?: string;
  created_at?: string;
  source_url?: string;
};

export default function MePage() {
  // Authenticate user and track in accounts table
  const { data: _authData } = useQuickAuth<{ userFid: number }>("/api/auth");
  
  const mini = useMiniKit();
  const rawUser = mini?.context?.user as unknown | undefined;
  const user = typeof rawUser === 'object' && rawUser !== null ? (rawUser as Record<string, unknown>) : undefined;
  const fid = user?.['fid'] ? String(user['fid']) : undefined;

  const [loading, setLoading] = useState(false);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fid) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const resp = await fetch(`/api/users/${encodeURIComponent(fid)}`);
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        if (cancelled) return;
        setTotalPoints(Number(data.total_points ?? 0));
        setContributions(Array.isArray(data.contributions) ? data.contributions : []);
      } catch (e: unknown) {
        setError(typeof e === 'string' ? e : (e instanceof Error ? e.message : 'Failed to load'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fid]);

  if (!user) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Your profile</h1>
        <p>Sign in to view your stats and contributions.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>{String(user?.displayName ?? user?.name ?? user?.username ?? 'Profile')}</h1>
      <div style={{ color: '#666', marginBottom: 16 }}>{`FID: ${String(user?.fid ?? '')}`}</div>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 6 }}>Points</h2>
        {loading && totalPoints === null ? <p>Loading…</p> : <div style={{ fontSize: 20, fontWeight: 700 }}>{totalPoints ?? 0} pts</div>}
      </section>

      <section>
        <h2 style={{ marginBottom: 6 }}>Recent contributions</h2>
        {loading && contributions.length === 0 ? (
          <p>Loading…</p>
        ) : contributions.length === 0 ? (
          <p>No contributions yet.</p>
        ) : (
          <ul>
            {contributions.map((c) => (
              <li key={String(c.id ?? Math.random())} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600 }}>
                  {c['source_url'] ? (
                    // eslint-disable-next-line @next/next/no-html-link-for-pages
                    <a href={String(c['source_url'])} style={{ color: '#0366d6', textDecoration: 'none' }}>
                      {String(c.reason ?? c.source_type ?? 'contribution')}
                    </a>
                  ) : (
                    String(c.reason ?? c.source_type ?? 'contribution')
                  )}
                </div>
                <div style={{ color: '#666', fontSize: 13 }}>
                  {Number(c.points ?? 0)} pts • {c.created_at ? new Date(String(c.created_at)).toLocaleString() : ''}
                </div>
              </li>
            ))}
          </ul>
        )}
        {error ? <div style={{ color: 'red' }}>{error}</div> : null}
      </section>
    </main>
  );
}
