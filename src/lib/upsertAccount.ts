/**
 * Upsert user account to track all users who interact with the app
 * This ensures the accounts table is populated automatically
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function upsertAccount(fid: string, displayName?: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("Skipping account upsert: Supabase not configured");
    return { success: false, error: "Supabase not configured" };
  }

  try {
    // Use Supabase upsert to create or update the account
    const payload: { fid: string; display_name?: string } = {
      fid,
    };

    if (displayName) {
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
      console.warn("Failed to upsert account", resp.status, text);
      return { success: false, error: text };
    }

    console.log("Account upserted for FID:", fid);
    return { success: true };
  } catch (err) {
    console.error("Error upserting account:", err);
    return { success: false, error: String(err) };
  }
}
