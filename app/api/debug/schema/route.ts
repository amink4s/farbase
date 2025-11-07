/**
 * Quick endpoint to check current database schema
 * GET /api/debug/schema
 */

import { NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const results: Record<string, unknown> = {};

  // Check each table
  const tables = [
    "accounts",
    "articles",
    "contributions",
    "user_points",
    "article_edits",
  ];

  for (const table of tables) {
    try {
      // Try to fetch one row to see the schema
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=1`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "apikey": SUPABASE_KEY,
        },
      });

      if (!resp.ok) {
        results[table] = {
          exists: false,
          error: `HTTP ${resp.status}`,
          details: await resp.text(),
        };
      } else {
        const data = await resp.json();
        const row = data[0];
        results[table] = {
          exists: true,
          columns: row ? Object.keys(row) : "empty table",
          sample_row: row || null,
        };
      }
    } catch (err) {
      results[table] = {
        exists: false,
        error: String(err),
      };
    }
  }

  return NextResponse.json({
    message: "Database schema check",
    results,
  });
}
