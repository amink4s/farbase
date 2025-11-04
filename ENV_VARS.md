## Environment variables & runtime secrets checklist

This file lists the environment variables and runtime settings required to build and run the project (locally and in production). Keep secrets out of source control — use Vercel/hosted secrets or a local `.env.local` file (gitignored).

### Required server-side vars (DO NOT expose to the browser)
- `SUPABASE_URL` — Supabase project URL (e.g. `https://xyz.supabase.co`). Used for server-side REST calls.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key. Server-only secret required for inserts/updates via REST. Treat like a password.

Optional but recommended for DB tooling:
- `DATABASE_URL` — Postgres connection string (used only when running migrations/scripts locally with psql).

### App / integration secrets
- `NEYNAR_API_KEY` — (optional) Neynar moderation / scoring API key. Server-only.
- `NEYNAR_API_URL` — (optional) Base URL for Neynar API if not the default.

### Admin & access control
- `ADMIN_FIDS` — Optional comma-separated list of FIDs (Farcaster IDs) that are treated as emergency/admin allowlist (string). Useful for emergency promotion of admin users.

### Points & feature flags
- `POINTS_INITIAL` — Optional integer overriding the default points awarded for initial approved contribution (server-side). Default configured in `src/config/points.ts`.
- `POINTS_EDIT` — Optional integer for points awarded per approved edit (server-side).

### Client-safe / public vars (prefix with NEXT_PUBLIC_)
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY` — Public OnchainKit API key used by client wallet integrations.
- `NEXT_PUBLIC_URL` or `NEXT_PUBLIC_APP_URL` — Public app base URL used in metadata / manifests.

### Vercel / hosting notes
- Set the server-only keys (`SUPABASE_SERVICE_ROLE_KEY`, `NEYNAR_API_KEY`, `DATABASE_URL`, etc.) in the Vercel Project Settings -> Environment Variables. Do NOT set them as `NEXT_PUBLIC_`.
- Provide values for both Preview and Production environments as appropriate.

### Local development
1. Create a `.env.local` (not committed) with placeholders, for example:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-side-service-role-key

# Optional DB for running migrations locally
DATABASE_URL=postgres://user:pass@localhost:5432/dbname

# Optional moderation API
NEYNAR_API_KEY=your-neynar-key

# Admin allowlist (comma-separated)
ADMIN_FIDS=12345,67890

# Public client keys (safe for browser)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=pk_test_...
NEXT_PUBLIC_URL=http://localhost:3000

# Optional points overrides
POINTS_INITIAL=100
POINTS_EDIT=5
```

2. Start the app locally: `npm run dev` (Next dev server reads `.env.local`).

### Quick verification
- Confirm the server process sees the env var:

```bash
# show that the var is present in the server runtime (do NOT paste secret values in public logs)
node -e "console.log(Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY))"
```

- Confirm Vercel has the same vars configured after deployment. If builds fail due to missing server-only vars, ensure they are defined in Project Settings and that any build-time code doesn't require secrets in client bundles.

### Security reminders
- Never commit `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, or any other secrets to the repository.
- Use server-only environment variables for secret keys; never prefix them with `NEXT_PUBLIC_`.
- Rotate `SUPABASE_SERVICE_ROLE_KEY` if you suspect it was exposed.

If you want, I can also add a `scripts/print_env.sh` helper (safe, prints only variable names presence) or a CI checklist to verify these are set in Vercel.
