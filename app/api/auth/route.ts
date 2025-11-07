import { Errors, createClient } from "@farcaster/quick-auth";
import { NextRequest, NextResponse } from "next/server";
import { upsertAccount } from "@/src/lib/upsertAccount";

const client = createClient();

export async function GET(request: NextRequest) {
  console.log("[AUTH] ========================================");
  console.log("[AUTH] Auth endpoint called");
  console.log("[AUTH] URL:", request.url);
  console.log("[AUTH] Method:", request.method);
  
  // Because we're fetching this endpoint via `sdk.quickAuth.fetch`,
  // if we're in a mini app, the request will include the necessary `Authorization` header.
  const authorization = request.headers.get("Authorization");

  // Here we ensure that we have a valid token.
  if (!authorization || !authorization.startsWith("Bearer ")) {
    console.log("[AUTH] ✗ Missing or invalid Authorization header");
    return NextResponse.json({ message: "Missing token" }, { status: 401 });
  }
  
  console.log("[AUTH] ✓ Authorization header present");

  try {
    // Now we verify the token. `domain` must match the domain of the request.
    // In our case, we're using the `getUrlHost` function to get the domain of the request
    // based on the Vercel environment. This will vary depending on your hosting provider.
    const payload = await client.verifyJwt({
      token: authorization.split(" ")[1] as string,
      domain: getUrlHost(request),
    });

    // If the token was valid, `payload.sub` will be the user's Farcaster ID.
    // This is guaranteed to be the user that signed the message in the mini app.
    // You can now use this to do anything you want, e.g. fetch the user's data from your database
    // or fetch the user's info from a service like Neynar.
    const userFid = payload.sub;

    console.log(`[AUTH] User authenticated - FID: ${userFid}`);

    // Automatically create/update account entry when user authenticates
    // This ensures all users who open the app are tracked in the accounts table
    const upsertResult = await upsertAccount(String(userFid));
    console.log(`[AUTH] Account upsert result:`, upsertResult);

    // Fetch the user's account data to get admin status
    let isAdmin = false;
    let isReviewer = false;
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (SUPABASE_URL && SUPABASE_KEY) {
        const accountResp = await fetch(
          `${SUPABASE_URL}/rest/v1/accounts?fid=eq.${userFid}&select=is_admin,is_reviewer&limit=1`,
          {
            headers: {
              Authorization: `Bearer ${SUPABASE_KEY}`,
              apikey: SUPABASE_KEY,
            },
          }
        );
        if (accountResp.ok) {
          const accounts = await accountResp.json();
          if (Array.isArray(accounts) && accounts.length > 0) {
            isAdmin = accounts[0].is_admin || false;
            isReviewer = accounts[0].is_reviewer || false;
            console.log(`[AUTH] User is_admin: ${isAdmin}, is_reviewer: ${isReviewer}`);
          }
        }
      }
    } catch (error) {
      console.warn(`[AUTH] Failed to fetch admin status:`, error);
    }

    // Return user data including admin status
    return NextResponse.json({ userFid, isAdmin, isReviewer });
  } catch (e) {
    if (e instanceof Errors.InvalidTokenError) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    if (e instanceof Error) {
      return NextResponse.json({ message: e.message }, { status: 500 });
    }

    throw e;
  }
}

function getUrlHost(request: NextRequest) {
  // First try to get the origin from the Origin header
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const url = new URL(origin);
      return url.host;
    } catch (error) {
      console.warn("Invalid origin header:", origin, error);
    }
  }

  // Fallback to Host header
  const host = request.headers.get("host");
  if (host) {
    return host;
  }

  // Final fallback to environment variables
  let urlValue: string;
  if (process.env.VERCEL_ENV === "production") {
    urlValue = process.env.NEXT_PUBLIC_URL!;
  } else if (process.env.VERCEL_URL) {
    urlValue = `https://${process.env.VERCEL_URL}`;
  } else {
    urlValue = "http://localhost:3000";
  }

  const url = new URL(urlValue);
  return url.host;
}
