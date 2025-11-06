# Accounts Table Auto-Population

## Problem
Users opening the app were not being logged in the `accounts` table.

## Root Cause
The authentication flow (`/api/auth`) only verified QuickAuth tokens but didn't persist user information to the database.

## Solution

### 1. Created `/src/lib/upsertAccount.ts`
A utility function that automatically creates or updates account entries in the database when users authenticate.

**Features:**
- Uses Supabase's `resolution=merge-duplicates` for upsert behavior
- Handles missing Supabase configuration gracefully
- Logs success/failure for monitoring

### 2. Updated `/app/api/auth/route.ts`
Added automatic account creation by calling `upsertAccount()` after successful QuickAuth verification.

**What happens now:**
1. User opens the mini app
2. QuickAuth token is verified
3. User's FID is automatically added to `accounts` table (if not exists) or updated (if exists)
4. All users who interact with the app are now tracked

### 3. Apply the Changes

To enable automatic account tracking, replace the existing auth route:

```bash
mv /workspaces/farbase/app/api/auth/route.ts.new /workspaces/farbase/app/api/auth/route.ts
```

Then build and deploy:
```bash
npm run build
git add -A
git commit -m "feat(auth): auto-populate accounts table on user authentication"
git push origin main
```

## Purpose of Accounts Table

The `accounts` table serves multiple purposes:

1. **User Tracking**
   - Records all users who interact with the app
   - Stores FID (Farcaster ID) as primary key
   - Optional: display_name, wallet address

2. **Permission Management**
   - `is_admin` flag: grants admin access (approve edits, airdrops, etc.)
   - `is_reviewer` flag: grants reviewer permissions
   - Enables role-based access control

3. **User Features**
   - Profile pages (`/me` endpoint)
   - Leaderboards and rankings
   - Activity tracking
   - Admin dashboards

4. **Analytics**
   - Track total unique users
   - Monitor user growth
   - Identify active contributors

## Testing

After deploying, test by:

1. Opening the mini app
2. Checking Vercel logs for: `"Account upserted for FID: {fid}"`
3. Querying the database:
   ```sql
   SELECT * FROM accounts ORDER BY created_at DESC LIMIT 10;
   ```

You should now see new account entries for each user who opens the app!

## Additional Improvements (Optional)

You can enhance the account tracking by:

1. **Fetching display names from Neynar** in the upsert function
2. **Adding last_seen timestamp** to track user activity
3. **Recording wallet addresses** from QuickAuth payload
4. **Tracking onboarding status** for new users

Example enhanced upsert:
```typescript
const payload = {
  fid,
  display_name: displayName,
  last_seen: new Date().toISOString(),
  // Add more fields as needed
};
```
