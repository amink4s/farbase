/**
 * Manual script to add an account to the accounts table
 * Usage: tsx scripts/add-account.ts <fid> [display_name]
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function addAccount(fid: string, displayName?: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const payload: { fid: string; display_name?: string } = { fid };
  if (displayName) {
    payload.display_name = displayName;
  }

  console.log(`📝 Adding account for FID ${fid}...`);

  const resp = await fetch(`${SUPABASE_URL}/rest/v1/accounts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates",
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "apikey": SUPABASE_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`❌ Failed to add account: ${resp.status} ${text}`);
    process.exit(1);
  }

  console.log(`✅ Account added/updated for FID ${fid}`);
}

// Parse command line args
const fid = process.argv[2];
const displayName = process.argv[3];

if (!fid) {
  console.error("Usage: tsx scripts/add-account.ts <fid> [display_name]");
  process.exit(1);
}

addAccount(fid, displayName);
