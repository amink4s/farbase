/**
 * Debug endpoint to test user logging system step-by-step
 * Call with: GET /api/debug/user-logging?fid=12345
 */

import { NextRequest, NextResponse } from "next/server";
import { upsertAccount } from "@/src/lib/upsertAccount";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get("fid");

  if (!fid) {
    return NextResponse.json({ error: "fid parameter required" }, { status: 400 });
  }

  const results: Record<string, unknown> = {
    step1_env_check: {},
    step2_upsert_call: {},
    step3_direct_check: {},
    step4_neynar_data: {},
  };

  // STEP 1: Check environment variables
  results.step1_env_check = {
    supabase_url_present: !!SUPABASE_URL,
    supabase_key_present: !!SUPABASE_KEY,
    supabase_url: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 30)}...` : "missing",
  };

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({
      error: "Supabase not configured",
      results,
    }, { status: 500 });
  }

  // STEP 2: Test upsertAccount function
  try {
    const upsertResult = await upsertAccount(fid, "Debug Test User");
    results.step2_upsert_call = {
      success: upsertResult.success,
      error: upsertResult.error || null,
    };
  } catch (err) {
    results.step2_upsert_call = {
      success: false,
      error: String(err),
    };
  }

  // STEP 3: Direct query to check if user exists in accounts table
  try {
    const checkResp = await fetch(`${SUPABASE_URL}/rest/v1/accounts?fid=eq.${fid}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "apikey": SUPABASE_KEY,
      },
    });

    if (!checkResp.ok) {
      results.step3_direct_check = {
        error: `HTTP ${checkResp.status}`,
        text: await checkResp.text(),
      };
    } else {
      const data = await checkResp.json();
      results.step3_direct_check = {
        found: data.length > 0,
        count: data.length,
        data: data,
      };
    }
  } catch (err) {
    results.step3_direct_check = {
      error: String(err),
    };
  }

  // STEP 4: Fetch user data from Neynar
  const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
  if (NEYNAR_API_KEY) {
    try {
      const neynarResp = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        {
          headers: {
            "Accept": "application/json",
            "api_key": NEYNAR_API_KEY,
          },
        }
      );

      if (!neynarResp.ok) {
        results.step4_neynar_data = {
          error: `HTTP ${neynarResp.status}`,
          text: await neynarResp.text(),
        };
      } else {
        const neynarData = await neynarResp.json();
        if (neynarData.users && neynarData.users.length > 0) {
          const user = neynarData.users[0];
          results.step4_neynar_data = {
            success: true,
            fid: user.fid,
            username: user.username,
            display_name: user.display_name,
            pfp_url: user.pfp_url,
            custody_address: user.custody_address,
            verified_addresses: user.verified_addresses,
          };
        } else {
          results.step4_neynar_data = {
            error: "User not found in Neynar",
          };
        }
      }
    } catch (err) {
      results.step4_neynar_data = {
        error: String(err),
      };
    }
  } else {
    results.step4_neynar_data = {
      error: "NEYNAR_API_KEY not configured",
    };
  }

  return NextResponse.json({
    message: "Debug user logging system",
    fid,
    results,
  });
}
