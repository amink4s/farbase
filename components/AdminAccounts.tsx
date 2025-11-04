"use client";
import React, { useEffect, useState } from "react";
import sdk from "@farcaster/miniapp-sdk";

type AccountRow = { fid: string; display_name?: string; is_admin?: boolean; created_at?: string };

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchAccounts() {
    setLoading(true);
    setError(null);
    try {
      let res: Response;
      if (sdk && sdk.quickAuth && typeof sdk.quickAuth.fetch === "function") {
        res = await sdk.quickAuth.fetch(`/api/admin/accounts`);
      } else {
        res = await fetch(`/api/admin/accounts`);
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      const data = await res.json();
      setAccounts(Array.isArray(data?.accounts) ? data.accounts : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function toggleAdmin(fid: string, makeAdmin: boolean) {
    setLoading(true);
    setError(null);
    try {
      const body = { fid, is_admin: makeAdmin };
      let res: Response;
      if (sdk && sdk.quickAuth && typeof sdk.quickAuth.fetch === "function") {
        res = await sdk.quickAuth.fetch(`/api/admin/accounts`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/admin/accounts`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      await fetchAccounts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Accounts</h2>
      {error && <div style={{ color: "#b00020" }}>Error: {error}</div>}
      {loading ? (
        <div>Loading…</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8 }}>FID</th>
              <th style={{ textAlign: "left", padding: 8 }}>Display</th>
              <th style={{ textAlign: "left", padding: 8 }}>Admin</th>
              <th style={{ textAlign: "left", padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.fid} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: 8, verticalAlign: "top" }}>{a.fid}</td>
                <td style={{ padding: 8, verticalAlign: "top" }}>{a.display_name ?? "—"}</td>
                <td style={{ padding: 8, verticalAlign: "top" }}>{String(Boolean(a.is_admin))}</td>
                <td style={{ padding: 8, verticalAlign: "top" }}>
                  <button onClick={() => toggleAdmin(a.fid, true)} disabled={Boolean(a.is_admin)}>
                    Promote
                  </button>
                  <button onClick={() => toggleAdmin(a.fid, false)} disabled={!a.is_admin} style={{ marginLeft: 8 }}>
                    Demote
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
