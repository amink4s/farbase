"use client";
import React, { useState } from 'react';

export default function AdminAirdrop() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      // prefer quickAuth.fetch if available in the host environment
      // @ts-ignore
      const fetcher = (typeof (globalThis as any).quickAuth?.fetch === 'function')
        ? (globalThis as any).quickAuth.fetch
        : fetch;

      const resp = await fetcher('/api/admin/airdrop?top=500');
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || resp.statusText);
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'airdrop.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <p>Export top user points for airdrop allocation (CSV).</p>
      <button onClick={handleExport} disabled={loading}>
        {loading ? 'Exporting…' : 'Export CSV'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
    </div>
  );
}
