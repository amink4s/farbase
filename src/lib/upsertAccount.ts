/**
 * Upsert user account to track all users who interact with the app
 * This ensures the accounts table is populated automatically
 * Now fetches full user profile data from Neynar
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  custody_address: string;
  follower_count?: number;
  following_count?: number;
  active_status?: string;
  verified_addresses?: {
    eth_addresses?: string[];
    sol_addresses?: string[];
  };
}

export async function upsertAccount(fid: string, displayName?: string, skipNeynar = false) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("Skipping account upsert: Supabase not configured");
    return { success: false, error: "Supabase not configured" };
  }

  try {
    // Prepare base payload
    const payload: Record<string, unknown> = { fid };

    // Fetch full user data from Neynar if available
    if (!skipNeynar && NEYNAR_API_KEY) {
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

        if (neynarResp.ok) {
          const neynarData = await neynarResp.json();
          if (neynarData.users && neynarData.users.length > 0) {
            const user: NeynarUser = neynarData.users[0];
            
            // Add all available user data
            payload.username = user.username;
            payload.display_name = user.display_name;
            payload.pfp_url = user.pfp_url;
            payload.custody_address = user.custody_address;
            
            // Store verified addresses as JSONB
            if (user.verified_addresses) {
              payload.verified_addresses = user.verified_addresses;
            }
            
            // Fetch Neynar user score from score endpoint
            let neynarScore = 0;
            try {
              const scoreResp = await fetch(
                `https://api.neynar.com/v1/farcaster/user?fid=${fid}`,
                {
                  headers: {
                    "Accept": "application/json",
                    "api_key": NEYNAR_API_KEY,
                  },
                }
              );
              if (scoreResp.ok) {
                const scoreData = await scoreResp.json();
                neynarScore = scoreData.result?.user?.neynarScore || 0;
              }
            } catch (scoreErr) {
              console.warn(`[UPSERT] Failed to fetch Neynar score for FID ${fid}:`, scoreErr);
            }
            
            // Auto-grant admin to high-quality users with strict filtering
            // Requirements (ALL must be met):
            // 1. Must have active_status "active:2" (unlikely to spam - Farcaster spam label 2)
            // 2. Must have Neynar score > 0.99
            // 3. Either: 100k+ followers OR trusted FID
            const followerCount = user.follower_count || 0;
            const trustedFids = ['477126']; // Add more trusted FIDs here
            const activeStatus = user.active_status || '';
            
            // Check if user has spam label 2 (unlikely to spam)
            const hasGoodSpamLabel = activeStatus === 'active:2';
            const hasHighScore = neynarScore > 0.99;
            const hasHighFollowers = followerCount >= 100000;
            const isTrustedFid = trustedFids.includes(fid);
            
            if (hasGoodSpamLabel && hasHighScore && (hasHighFollowers || isTrustedFid)) {
              payload.is_admin = true;
              console.log(`[UPSERT] 🔐 Auto-granted admin to FID ${fid} (followers: ${followerCount}, spam: ${activeStatus}, score: ${neynarScore})`);
            } else {
              const reasons = [];
              if (!hasGoodSpamLabel) reasons.push(`spam label: ${activeStatus}`);
              if (!hasHighScore) reasons.push(`score: ${neynarScore}`);
              if (!hasHighFollowers && !isTrustedFid) reasons.push(`followers: ${followerCount}`);
              if (reasons.length > 0) {
                console.log(`[UPSERT] ⚠️ FID ${fid} not granted admin - Failed: ${reasons.join(', ')}`);
              }
            }
            
            console.log(`[UPSERT] Fetched full profile for FID ${fid}: @${user.username} (${followerCount} followers, spam: ${activeStatus}, score: ${neynarScore})`);
          } else {
            console.warn(`[UPSERT] FID ${fid} not found in Neynar`);
          }
        } else {
          console.warn(`[UPSERT] Neynar API error: ${neynarResp.status}`);
        }
      } catch (neynarErr) {
        console.warn("[UPSERT] Failed to fetch from Neynar:", neynarErr);
        // Continue with basic upsert even if Neynar fails
      }
    }
    
    // Fallback to provided displayName if Neynar didn't populate it
    if (!payload.display_name && displayName) {
      payload.display_name = displayName;
    }

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Use merge-duplicates to upsert on conflict (fid is PRIMARY KEY)
        "Prefer": "resolution=merge-duplicates",
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "apikey": SUPABASE_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.warn(`[UPSERT] Failed to upsert account for FID ${fid}:`, resp.status, text);
      return { success: false, error: text };
    }

    console.log(`[UPSERT] ✓ Account upserted for FID ${fid}`);
    return { success: true };
  } catch (err) {
    console.error(`[UPSERT] Error upserting account for FID ${fid}:`, err);
    return { success: false, error: String(err) };
  }
}
