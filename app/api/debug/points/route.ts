/**
 * Debug endpoint to test points system step-by-step
 * Call with: GET /api/debug/points?fid=12345
 */

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get("fid");

  const results: Record<string, unknown> = {
    step1_env_check: {},
    step2_contributions: {},
    step3_user_points: {},
    step4_articles: {},
    step5_article_edits: {},
  };

  // STEP 1: Check environment variables
  results.step1_env_check = {
    supabase_url_present: !!SUPABASE_URL,
    supabase_key_present: !!SUPABASE_KEY,
  };

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({
      error: "Supabase not configured",
      results,
    }, { status: 500 });
  }

  // STEP 2: Check contributions table (with optional FID filter)
  try {
    const contribUrl = fid
      ? `${SUPABASE_URL}/rest/v1/contributions?fid=eq.${fid}&order=created_at.desc&limit=10`
      : `${SUPABASE_URL}/rest/v1/contributions?order=created_at.desc&limit=10`;

    const contribResp = await fetch(contribUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "apikey": SUPABASE_KEY,
      },
    });

    if (!contribResp.ok) {
      results.step2_contributions = {
        error: `HTTP ${contribResp.status}`,
        text: await contribResp.text(),
      };
    } else {
      const data = await contribResp.json();
      results.step2_contributions = {
        count: data.length,
        total_points: data.reduce((sum: number, c: { points?: number }) => sum + (c.points || 0), 0),
        records: data,
      };
    }
  } catch (err) {
    results.step2_contributions = {
      error: String(err),
    };
  }

  // STEP 3: Check user_points table (with optional FID filter)
  try {
    const pointsUrl = fid
      ? `${SUPABASE_URL}/rest/v1/user_points?fid=eq.${fid}`
      : `${SUPABASE_URL}/rest/v1/user_points?order=total_points.desc&limit=10`;

    const pointsResp = await fetch(pointsUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "apikey": SUPABASE_KEY,
      },
    });

    if (!pointsResp.ok) {
      results.step3_user_points = {
        error: `HTTP ${pointsResp.status}`,
        text: await pointsResp.text(),
      };
    } else {
      const data = await pointsResp.json();
      results.step3_user_points = {
        count: data.length,
        records: data,
      };
    }
  } catch (err) {
    results.step3_user_points = {
      error: String(err),
    };
  }

  // STEP 4: Check articles (with optional FID filter)
  try {
    const articlesUrl = fid
      ? `${SUPABASE_URL}/rest/v1/articles?author_fid=eq.${fid}&order=created_at.desc&limit=10&select=id,slug,title,author_fid,vetted,created_at`
      : `${SUPABASE_URL}/rest/v1/articles?order=created_at.desc&limit=10&select=id,slug,title,author_fid,vetted,created_at`;

    const articlesResp = await fetch(articlesUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "apikey": SUPABASE_KEY,
      },
    });

    if (!articlesResp.ok) {
      results.step4_articles = {
        error: `HTTP ${articlesResp.status}`,
        text: await articlesResp.text(),
      };
    } else {
      const data = await articlesResp.json();
      results.step4_articles = {
        count: data.length,
        vetted_count: data.filter((a: { vetted?: boolean }) => a.vetted).length,
        records: data,
      };
    }
  } catch (err) {
    results.step4_articles = {
      error: String(err),
    };
  }

  // STEP 5: Check article_edits (with optional FID filter)
  try {
    const editsUrl = fid
      ? `${SUPABASE_URL}/rest/v1/article_edits?author_fid=eq.${fid}&order=created_at.desc&limit=10&select=id,article_id,author_fid,approved,created_at`
      : `${SUPABASE_URL}/rest/v1/article_edits?order=created_at.desc&limit=10&select=id,article_id,author_fid,approved,created_at`;

    const editsResp = await fetch(editsUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "apikey": SUPABASE_KEY,
      },
    });

    if (!editsResp.ok) {
      results.step5_article_edits = {
        error: `HTTP ${editsResp.status}`,
        text: await editsResp.text(),
      };
    } else {
      const data = await editsResp.json();
      results.step5_article_edits = {
        count: data.length,
        approved_count: data.filter((e: { approved?: boolean }) => e.approved).length,
        records: data,
      };
    }
  } catch (err) {
    results.step5_article_edits = {
      error: String(err),
    };
  }

  return NextResponse.json({
    message: "Debug points system",
    fid: fid || "all",
    results,
  });
}
