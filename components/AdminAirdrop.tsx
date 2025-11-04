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
      const maybeGlobal = globalThis as unknown as { quickAuth?: { fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response> } };
      const fetcher = typeof maybeGlobal.quickAuth?.fetch === 'function' ? maybeGlobal.quickAuth.fetch.bind(maybeGlobal.quickAuth) : fetch;

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
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setError(errMsg);
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
