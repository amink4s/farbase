import { NextApiRequest, NextApiResponse } from 'next';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Simple in-memory cache to reduce Supabase calls per server instance
const CACHE_TTL_SECONDS = Number(process.env.USER_CACHE_TTL_SECONDS ?? 60);
type UserPayload = { fid: string; total_points: number; contributions: Array<Record<string, unknown>> };
type CacheEntry = { ts: number; data: UserPayload };
const cache = new Map<string, CacheEntry>();

async function fetchJson(url: string) {
  const hdrs: Record<string, string> = { Authorization: `Bearer ${String(SUPABASE_KEY)}`, apikey: String(SUPABASE_KEY) };
  const resp = await fetch(url, { headers: hdrs });
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
  return resp.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { fid } = req.query as { fid?: string };
  if (!fid) return res.status(400).json({ error: 'Missing fid parameter' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Missing Supabase env' });

  const cacheKey = `user:${fid}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.ts < CACHE_TTL_SECONDS * 1000) {
    return res.status(200).json(cached.data);
  }

  try {
    // Fetch aggregate points
    let total_points = 0;
    try {
      const pts = await fetchJson(`${SUPABASE_URL}/rest/v1/user_points?select=fid,total_points&fid=eq.${encodeURIComponent(fid)}&limit=1`);
      const row = Array.isArray(pts) && pts.length > 0 ? pts[0] : null;
      total_points = Number(row?.total_points ?? 0);
    } catch (e) {
      console.warn('Failed to fetch user_points for', fid, e instanceof Error ? e.message : String(e));
    }

    // Fetch recent contributions
    let contributions: Array<Record<string, unknown>> = [];
    try {
      const contribUrl = `${SUPABASE_URL}/rest/v1/contributions?select=id,source_type,source_id,points,reason,created_at&fid=eq.${encodeURIComponent(
        fid
      )}&order=created_at.desc&limit=200`;
      const json = await fetchJson(contribUrl);
      contributions = Array.isArray(json) ? json : [json];

      // Resolve source_url for contributions when possible (best-effort)
      for (const c of contributions) {
        try {
          const st = String(c.source_type ?? '').toLowerCase();
          const sid = c.source_id;
          let source_url: string | null = null;

          if ((st === 'edit' || st.includes('edit')) && sid != null) {
            // fetch the article_edit to find article_id
            try {
              const edits = await fetchJson(
                `${SUPABASE_URL}/rest/v1/article_edits?id=eq.${encodeURIComponent(String(sid))}&select=article_id&limit=1`
              );
              const editRow = Array.isArray(edits) && edits.length > 0 ? edits[0] : null;
              const articleId = editRow?.article_id;
              if (articleId != null) {
                const art = await fetchJson(
                  `${SUPABASE_URL}/rest/v1/articles?id=eq.${encodeURIComponent(String(articleId))}&select=slug&limit=1`
                );
                const artRow = Array.isArray(art) && art.length > 0 ? art[0] : null;
                const slug = artRow?.slug;
                if (slug) source_url = `/articles/${encodeURIComponent(String(slug))}/edits/${encodeURIComponent(String(sid))}`;
              }
            } catch {
              // ignore resolution errors
            }
          } else if ((st.includes('initial') || st.includes('publication') || st.includes('article')) && sid != null) {
            try {
              const art = await fetchJson(
                `${SUPABASE_URL}/rest/v1/articles?id=eq.${encodeURIComponent(String(sid))}&select=slug&limit=1`
              );
              const artRow = Array.isArray(art) && art.length > 0 ? art[0] : null;
              const slug = artRow?.slug;
              if (slug) source_url = `/articles/${encodeURIComponent(String(slug))}`;
            } catch {
              // ignore
            }
          }

          if (source_url) c['source_url'] = source_url;
        } catch {
          // per-contribution best-effort; continue
        }
      }
    } catch (e) {
      console.warn('Failed to fetch contributions for', fid, e instanceof Error ? e.message : String(e));
    }

    const payload = { fid, total_points, contributions };
    cache.set(cacheKey, { ts: now, data: payload });
    return res.status(200).json(payload);
  } catch (e) {
    console.error('Error in /api/users/[fid]:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
