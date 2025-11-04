import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, Errors } from '@farcaster/quick-auth';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const quickAuth = createClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Missing Supabase env' });

  // Only allow GET for CSV export
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify QuickAuth
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing QuickAuth token' });
  const token = authorization.split(' ')[1] as string;
  let payload: unknown;
  try {
    payload = await quickAuth.verifyJwt({ token, domain: getUrlHost(req) });
  } catch (e) {
    if (e instanceof Errors.InvalidTokenError) return res.status(401).json({ error: 'Invalid QuickAuth token' });
    console.error('QuickAuth verify error:', e);
    return res.status(500).json({ error: 'QuickAuth verification error' });
  }

  const fid = typeof payload === 'object' && payload !== null && 'sub' in payload && typeof (payload as Record<string, unknown>).sub === 'string'
    ? String((payload as Record<string, unknown>).sub)
    : null;
  if (!fid) return res.status(401).json({ error: 'QuickAuth token missing sub (fid)' });

  // Check admin permission (ADMIN_FIDS env or accounts.is_admin)
  const ADMIN_FIDS = process.env.ADMIN_FIDS || process.env.ADMIN_FID;
  let isAdmin = false;
  if (ADMIN_FIDS) {
    const list = ADMIN_FIDS.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.includes(fid)) isAdmin = true;
  } else {
    try {
      const accResp = await fetch(`${SUPABASE_URL}/rest/v1/accounts?select=is_admin&fid=eq.${encodeURIComponent(fid)}&limit=1`, {
        headers: { Authorization: `Bearer ${String(SUPABASE_KEY)}`, apikey: String(SUPABASE_KEY) } as Record<string, string>,
      });
      if (!accResp.ok) {
        const txt = await accResp.text();
        console.error('Supabase REST error fetching account:', accResp.status, txt);
        return res.status(502).json({ error: 'Supabase REST error', details: txt });
      }
      const rows = await accResp.json();
      const first = Array.isArray(rows) && rows.length > 0 ? rows[0] as { is_admin?: boolean } : undefined;
      isAdmin = Boolean(first?.is_admin);
    } catch (e) {
      console.error('Error checking admin status:', e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (!isAdmin) return res.status(403).json({ error: 'Forbidden: admin access required' });

  try {
    const top = Math.min(10000, Math.max(1, Number(req.query.top ?? 100)));

    // Fetch top N user_points
    const listResp = await fetch(`${SUPABASE_URL}/rest/v1/user_points?select=fid,total_points&order=total_points.desc&limit=${top}`, {
      headers: { Authorization: `Bearer ${String(SUPABASE_KEY)}`, apikey: String(SUPABASE_KEY) } as Record<string, string>,
    });
    if (!listResp.ok) {
      const txt = await listResp.text();
      return res.status(502).json({ error: 'Supabase REST error', details: txt });
    }
  const rowsJson = await listResp.json();
  const rows = Array.isArray(rowsJson) ? (rowsJson as Array<Record<string, unknown>>) : [];

    // Also compute total across all user_points for share calculation
    const totalResp = await fetch(`${SUPABASE_URL}/rest/v1/user_points?select=total_points`, {
      headers: { Authorization: `Bearer ${String(SUPABASE_KEY)}`, apikey: String(SUPABASE_KEY) } as Record<string, string>,
    });
    let totalAll = 0;
    if (totalResp.ok) {
      const all = await totalResp.json();
      if (Array.isArray(all)) totalAll = all.reduce((s: number, r: Record<string, unknown>) => s + Number(r['total_points'] || 0), 0);
    }

    // Build CSV
    const header = 'fid,total_points,share\n';
    const lines = (rows as Array<Record<string, unknown>>).map((r) => {
      const pts = Number(r['total_points'] || 0);
      const share = totalAll > 0 ? (pts / totalAll).toFixed(6) : '0';
      return `${String(r['fid'] ?? '')},${pts},${share}`;
    });
    const csv = header + lines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="airdrop_top_${top}.csv"`);
    return res.status(200).send(csv);
  } catch (e) {
    console.error('API airdrop export error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getUrlHost(req: NextApiRequest) {
  const origin = req.headers.origin;
  if (origin) {
    try {
      const url = new URL(origin);
      return url.host;
    } catch (e) {
      console.warn('Invalid origin header:', origin, e);
    }
  }
  const host = req.headers.host;
  if (host) return host;
  if (process.env.VERCEL_ENV === 'production') return process.env.NEXT_PUBLIC_URL!;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';

}

