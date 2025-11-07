# User Logging & Points System - Debug Guide

## Problem Summary

Two critical systems are not working as expected:

1. **User Logging**: Users opening the mini app are not being saved to the `accounts` table
2. **Points System**: When admins approve articles, points are not being saved to the database

## Expected Flow

### User Authentication Flow (Should happen automatically)
1. User opens mini app
2. `useQuickAuth` hook is triggered on home page
3. Hook calls `/api/auth` endpoint with QuickAuth JWT
4. Server verifies JWT and extracts FID from `payload.sub`
5. Server calls `upsertAccount(fid)` to track user
6. User data saved to `accounts` table with:
   - FID (Farcaster ID)
   - Display name
   - Other profile data

### Points Awarding Flow (Should happen on approval)
1. User creates article → Creates `article_edits` entry with `approved=false`
2. Admin/reviewer approves edit → Calls `/api/articles/[slug]/edits/[id]/approve`
3. Approval endpoint:
   - Updates article (sets `published=true` if first publication)
   - Marks edit as `approved=true`
   - Inserts row in `contributions` table (ledger)
   - Updates/inserts row in `user_points` table (aggregate)

## Debug Endpoints Created

### 1. Test User Logging System
```
GET /api/debug/user-logging?fid=12345
```

**What it checks:**
- ✅ Environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- ✅ Calls `upsertAccount()` function directly
- ✅ Queries `accounts` table to verify user was saved
- ✅ Fetches user data from Neynar API (username, display_name, pfp_url)

**Example usage:**
```bash
curl "http://localhost:3000/api/debug/user-logging?fid=12345"
```

### 2. Test Points System
```
GET /api/debug/points?fid=12345
```

**What it checks:**
- ✅ Environment variables
- ✅ Contributions table (all point-earning actions)
- ✅ User_points table (aggregated totals)
- ✅ Articles table (published/vetted status)
- ✅ Article_edits table (approval status)

**Example usage:**
```bash
# Check specific user
curl "http://localhost:3000/api/debug/points?fid=12345"

# Check all users (top 10 recent)
curl "http://localhost:3000/api/debug/points"
```

## Step-by-Step Debugging Process

### Phase 1: User Logging Investigation

#### Step 1: Verify Auth Endpoint is Being Called
```bash
# Check Vercel deployment logs
gh repo view --web  # Navigate to Vercel dashboard
# Look for "[AUTH] Auth endpoint called" log entries
```

**What to look for:**
- Are you seeing `[AUTH] Auth endpoint called` in logs?
- If NO → `useQuickAuth` might not be triggering
- If YES → Continue to Step 2

#### Step 2: Test Direct User Upsert
```bash
# Test with a known FID (use your own or test account)
curl "https://your-deployment.vercel.app/api/debug/user-logging?fid=YOUR_FID"
```

**Expected result:**
```json
{
  "message": "Debug user logging system",
  "fid": "YOUR_FID",
  "results": {
    "step1_env_check": {
      "supabase_url_present": true,
      "supabase_key_present": true
    },
    "step2_upsert_call": {
      "success": true
    },
    "step3_direct_check": {
      "found": true,
      "count": 1,
      "data": [{ "fid": "YOUR_FID", "display_name": "Debug Test User", ... }]
    },
    "step4_neynar_data": {
      "success": true,
      "username": "...",
      "display_name": "...",
      "pfp_url": "..."
    }
  }
}
```

**If step2_upsert_call.success is false:**
- Check the error message
- Verify Supabase permissions (SERVICE_ROLE_KEY should have full access)
- Check accounts table exists in Supabase

**If step3_direct_check.found is false:**
- Upsert is failing silently
- Check Supabase logs for errors
- Verify accounts table schema matches expected format

#### Step 3: Check Accounts Table Schema
```sql
-- Run in Supabase SQL Editor
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'accounts'
ORDER BY ordinal_position;
```

**Expected columns:**
- `fid` TEXT (PRIMARY KEY)
- `address` TEXT (nullable)
- `display_name` TEXT (nullable)
- `is_admin` BOOLEAN (default false)
- `is_reviewer` BOOLEAN (default false)
- `created_at` TIMESTAMPTZ

**Missing columns needed:**
- `username` TEXT
- `pfp_url` TEXT
- `custody_address` TEXT (optional)

#### Step 4: Enhance Schema (if needed)
```sql
-- Add missing user profile columns
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pfp_url TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS custody_address TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS verified_addresses JSONB;
```

### Phase 2: Points System Investigation

#### Step 1: Check if Points Tables Exist
```bash
curl "https://your-deployment.vercel.app/api/debug/points"
```

**Expected result:**
- Should return data from contributions and user_points tables
- If error about missing tables → Run migrations

#### Step 2: Run Missing Migrations (if needed)
```sql
-- Run in Supabase SQL Editor
-- (See migrations/004_create_points.sql for full schema)

CREATE TABLE IF NOT EXISTS contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fid text NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  points integer NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_points (
  fid text PRIMARY KEY,
  total_points bigint NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now()
);
```

#### Step 3: Test End-to-End Approval Flow
1. Create a test article as a user
2. Note the article slug and author FID
3. Find the article_edit entry:
```bash
curl "https://your-deployment.vercel.app/api/debug/points?fid=AUTHOR_FID"
# Look at results.step5_article_edits for the edit ID
```

4. Approve the edit as an admin:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ADMIN_QUICKAUTH_TOKEN" \
  "https://your-deployment.vercel.app/api/articles/SLUG/edits/EDIT_ID/approve"
```

5. Check if points were awarded:
```bash
curl "https://your-deployment.vercel.app/api/debug/points?fid=AUTHOR_FID"
```

**What to look for:**
- `step2_contributions`: Should show new entry with points
- `step3_user_points`: Should show updated total_points
- If missing → Check approval endpoint logs for errors

#### Step 4: Check Approval Endpoint Logs
Look for these log messages in Vercel:
- `Failed to insert contribution row:` → Permissions issue
- `Failed to fetch user_points row:` → Table doesn't exist or no access
- `Failed to patch user_points row:` → Update failed
- `Failed to insert user_points row:` → Insert failed
- `Error awarding points after approval:` → General error

### Phase 3: Root Cause Analysis

Common issues and solutions:

#### Issue: Accounts table not being populated
**Possible causes:**
1. `useQuickAuth` not triggering (check if hook is enabled in page)
2. `/api/auth` endpoint errors (check Vercel logs)
3. `upsertAccount` function failing (check SERVICE_ROLE_KEY permissions)
4. Supabase REST API returning errors (check response bodies)
5. Network issues between Vercel and Supabase

**Solution steps:**
1. Enable `useQuickAuth` on all pages where users land
2. Add more logging to `/api/auth` endpoint
3. Verify Supabase SERVICE_ROLE_KEY has write permissions
4. Check Supabase RLS policies (should be disabled for SERVICE_ROLE)

#### Issue: Points not being saved
**Possible causes:**
1. Contributions table missing or inaccessible
2. User_points table missing or inaccessible
3. Approval endpoint not being called
4. Silent failures in points awarding logic
5. Supabase permissions blocking writes

**Solution steps:**
1. Run migrations to create tables
2. Verify SERVICE_ROLE_KEY has write access to both tables
3. Test approval endpoint directly with curl
4. Add more error logging to approval endpoint
5. Check Supabase logs for permission errors

## Next Steps

1. **Run both debug endpoints** to gather current state
2. **Share results** from debug endpoints
3. **Check Vercel logs** for auth and approval endpoint calls
4. **Verify Supabase** has all required tables and columns
5. **Test end-to-end** with a real user FID

Once we identify the specific failure points, we can make targeted fixes.

## Key Files Reference

- `/app/api/auth/route.ts` - Authentication endpoint with upsertAccount call
- `/src/lib/upsertAccount.ts` - User tracking function
- `/src/pages/api/articles/[slug]/edits/[id]/approve.ts` - Approval endpoint with points logic
- `/schema.sql` - Base database schema
- `/migrations/004_create_points.sql` - Points tables schema
- `/app/api/debug/user-logging/route.ts` - Debug endpoint for user logging (NEW)
- `/app/api/debug/points/route.ts` - Debug endpoint for points system (NEW)
