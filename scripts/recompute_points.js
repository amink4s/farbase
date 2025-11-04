/*
  Recompute `user_points` aggregates from the `contributions` ledger.
  Intended to run as a nightly cron job. It reads all contributions, aggregates
  totals per fid, and upserts `user_points` accordingly.

  Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/recompute_points.js
*/
const fetch = global.fetch || require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function main() {
  console.log('Fetching all contributions...');
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/contributions?select=fid,points`, {
    headers: { Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
  });
  if (!resp.ok) {
    const txt = await resp.text();
    console.error('Failed to fetch contributions:', txt);
    process.exit(2);
  }
  const rows = await resp.json();
  const totals = {};
  for (const r of rows) {
    const fid = r.fid;
    const p = Number(r.points || 0);
    totals[fid] = (totals[fid] || 0) + p;
  }

  console.log('Upserting user_points rows for', Object.keys(totals).length, 'users');
  for (const [fid, total] of Object.entries(totals)) {
    // Try to update existing row
    const patchResp = await fetch(`${SUPABASE_URL}/rest/v1/user_points?fid=eq.${encodeURIComponent(fid)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      body: JSON.stringify({ total_points: total, last_updated: new Date().toISOString() }),
    });
    if (patchResp.ok) continue;

    // Insert if patch failed (row didn't exist)
    const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/user_points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      body: JSON.stringify({ fid, total_points: total }),
    });
    if (!insertResp.ok) {
      const txt = await insertResp.text();
      console.error('Failed to insert user_points for', fid, txt);
    }
  }

  console.log('Recompute complete');
}

main().catch((e) => {
  console.error('Recompute failed:', e);
  process.exit(1);
});
