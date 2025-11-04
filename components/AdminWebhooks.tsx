"use client";
import React, { useEffect, useState } from "react";
import sdk from "@farcaster/miniapp-sdk";

type EventRow = {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  headers: Record<string, unknown> | null;
  verified: boolean;
  received_at: string;
};

export default function AdminWebhooks() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function fetchEvents(p = page, eType = filter) {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(p));
      qs.set("per_page", String(perPage));
      if (eType) qs.set("event_type", eType);

      let res: Response;
      if (sdk && sdk.quickAuth && typeof sdk.quickAuth.fetch === "function") {
        res = await sdk.quickAuth.fetch(`/api/webhook_events?${qs.toString()}`);
      } else {
        res = await fetch(`/api/webhook_events?${qs.toString()}`);
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }

      const data = await res.json();
      setEvents(Array.isArray(data?.events) ? data.events : []);
      setPage(data?.page ?? p);
      setPerPage(data?.per_page ?? perPage);
      setTotal(typeof data?.total === "number" ? data.total : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEvents(1, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Webhook Events</h2>
      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <input
          placeholder="Filter by event_type"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button onClick={() => fetchEvents(1, filter)} disabled={loading}>Search</button>
        <div style={{ marginLeft: "auto" }}>
          <label>
            Per page:
            <select value={perPage} onChange={(e) => setPerPage(parseInt(e.target.value, 10))}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </div>

      {error && <div style={{ color: "#b00020" }}>Error: {error}</div>}

      <div style={{ marginTop: 12 }}>
        {loading ? (
          <div>Loading…</div>
        ) : events.length === 0 ? (
          <div>No events</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8 }}>Event Type</th>
                <th style={{ textAlign: "left", padding: 8 }}>Received At</th>
                <th style={{ textAlign: "left", padding: 8 }}>Verified</th>
                <th style={{ textAlign: "left", padding: 8 }}>Payload</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 8, verticalAlign: "top" }}>{ev.event_type}</td>
                  <td style={{ padding: 8, verticalAlign: "top" }}>{new Date(ev.received_at).toLocaleString()}</td>
                  <td style={{ padding: 8, verticalAlign: "top" }}>{String(ev.verified)}</td>
                  <td style={{ padding: 8, verticalAlign: "top", fontFamily: "monospace", fontSize: 12 }}>
                    <pre style={{ maxHeight: 200, overflow: "auto", margin: 0 }}>{JSON.stringify(ev.payload, null, 2)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button disabled={page <= 1 || loading} onClick={() => fetchEvents(page - 1, filter)}>
          Previous
        </button>
        <div>Page {page}{total ? ` — ${total} total` : ""}</div>
        <button disabled={loading || (total !== null && page * perPage >= total)} onClick={() => fetchEvents(page + 1, filter)}>
          Next
        </button>
      </div>
    </div>
  );
}
