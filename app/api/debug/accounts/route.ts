import { NextResponse } from "next/server";

/**
 * Debug endpoint to test account creation manually
 * Usage: GET /api/debug/accounts?fid=12345
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get("fid");

  if (!fid) {
    return NextResponse.json({ error: "Missing fid parameter" }, { status: 400 });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[DEBUG] Environment check:");
  console.log("- SUPABASE_URL:", SUPABASE_URL ? "✓ Set" : "✗ Missing");
  console.log("- SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_KEY ? "✓ Set" : "✗ Missing");

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ 
      error: "Supabase not configured",
      details: {
        hasUrl: !!SUPABASE_URL,
        hasKey: !!SUPABASE_KEY
      }
    }, { status: 500 });
  }

  try {
    const payload = { fid };
    const url = `${SUPABASE_URL}/rest/v1/accounts`;

    console.log("[DEBUG] Attempting to upsert account:");
    console.log("- URL:", url);
    console.log("- Payload:", payload);

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "apikey": SUPABASE_KEY,
      },
      body: JSON.stringify(payload),
    });

    console.log("[DEBUG] Response status:", resp.status);
    const text = await resp.text();
    console.log("[DEBUG] Response body:", text);

    if (!resp.ok) {
      return NextResponse.json({
        error: "Failed to upsert account",
        status: resp.status,
        body: text,
      }, { status: resp.status });
    }

    return NextResponse.json({
      success: true,
      message: `Account upserted for FID ${fid}`,
      response: text ? JSON.parse(text) : null,
    });
  } catch (err) {
    console.error("[DEBUG] Error:", err);
    return NextResponse.json({
      error: "Exception occurred",
      message: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
