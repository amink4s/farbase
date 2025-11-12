import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

  const result: Record<string, unknown> = {
    env: {
      has_SUPABASE_URL: Boolean(SUPABASE_URL),
      has_SUPABASE_SERVICE_ROLE_KEY: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      has_NEYNAR_API_KEY: Boolean(NEYNAR_API_KEY),
      vercel_url: process.env.VERCEL_URL || null,
      vercel_env: process.env.VERCEL_ENV || null,
    },
    supabase: {},
    neynar: {},
  };

  // Supabase basic check
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=slug,metadata,published&limit=3`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
        cache: 'no-store',
      });
      const text = await resp.text();
      result.supabase = { status: resp.status, ok: resp.ok, body: safeJson(text) };

      // Category-filter check
      const resp2 = await fetch(
        `${SUPABASE_URL}/rest/v1/articles?select=slug,metadata,published&published=eq.true&metadata->>category=eq.project&limit=3`,
        {
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
          },
          cache: 'no-store',
        }
      );
      const text2 = await resp2.text();
      (result.supabase as Record<string, unknown>).projectFilter = { status: resp2.status, ok: resp2.ok, body: safeJson(text2) };
    } catch (e) {
      result.supabase = { error: String(e) };
    }
  }

  // Neynar basic check (with a tiny harmless request)
  if (NEYNAR_API_KEY) {
    try {
      const resp = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=3`, {
        headers: { accept: 'application/json', 'x-api-key': NEYNAR_API_KEY },
        cache: 'no-store',
      });
      const text = await resp.text();
      result.neynar = { status: resp.status, ok: resp.ok, body: safeJson(text) };
    } catch (e) {
      result.neynar = { error: String(e) };
    }
  }

  return NextResponse.json(result, { status: 200 });
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 2048);
  }
}
