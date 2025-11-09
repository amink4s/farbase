# Critical Issues Found & Fixes Required

## ISSUE #1: Data Type Mismatch (CRITICAL - Prevents Points from Being Awarded)

### Problem:
- `articles.author_fid` is stored as TEXT
- `likes.user_fid` was BIGINT 
- `user_points.fid` is TEXT
- `increment_user_points()` function expected BIGINT parameter
- When code calls `increment_user_points(article.author_fid, 1)`, it passes TEXT to a function expecting BIGINT
- This causes a silent failure - no error is thrown, but points are never added

### Fix:
Run the migration file: `/workspaces/farbase/migrations/005_fix_fid_types.sql`

This will:
1. Change all FID columns to TEXT type (consistent with Farcaster standards)
2. Update the `increment_user_points()` function to accept TEXT
3. Ensure the function also updates `last_updated` timestamp

---

## ISSUE #2: Like Status Not Persisting on Page Reload

### Problem:
In `/workspaces/farbase/app/articles/[slug]/page.tsx` line 68:
```typescript
let userFid: number | undefined = undefined;
```

And line 79:
```typescript
userFid = payload.sub; // payload.sub is a number
```

But when querying the database (line 98):
```typescript
.eq("user_fid", userFid) // comparing number to TEXT column
```

The database has TEXT type for user_fid, but the code is comparing it with a number. This causes the query to fail silently and always return no results, so `hasLiked` is always false.

### Fix:
Convert userFid to string when storing and comparing.

---

## ISSUE #3: Potential Type Issues in API Endpoints

The like.ts and flag.ts endpoints get `payload.sub` (number) but pass it to database TEXT columns. Need to ensure conversion happens.

---

## Steps to Fix Everything:

### Step 1: Run Database Migration
1. Open Supabase SQL Editor
2. First run `/workspaces/farbase/diagnostics.sql` to see current state
3. Then run `/workspaces/farbase/migrations/005_fix_fid_types.sql`
4. Verify success message appears

### Step 2: Update Frontend Code
Fix the page.tsx file to properly handle FID as string

### Step 3: Verify API Endpoints
Ensure all API endpoints convert FID to string before database operations

### Step 4: Test
1. Like an article
2. Check `point_logs` table - should see entry
3. Check `user_points` table - should see points added
4. Refresh page - like should still show as liked
