# Farbase (Farpedia) — Base / Farcaster mini app (scaffold)

Minimal scaffold for the Farbase mini app using the Base Mini Kit (Next.js app dir) and Supabase.

What this branch adds
- Initial project scaffold and API stubs (to be created on branch `scaffold/base-mini-kit`).
- Server API will use Supabase REST (server-side calls with SERVICE_ROLE key).
- CI deploy workflow (placeholder) for Vercel via GitHub Actions.

Quick next steps
1. Create the scaffold branch (done).
2. Add scaffold files (README, DB schema, API stubs, CI workflow) — each will be added one at a time so you can confirm.
3. After files are added, push branch and open a PR titled:
   "scaffold: add base-mini-kit and API stubs"

Environment variables (exact names)
- SUPABASE_URL — Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (server-only)
- NEYNAR_API_KEY — Neynar moderation/score API key (server-only)
- VERCEL_TOKEN — Vercel token for CI deploy (GitHub Actions)
- VERCEL_ORG_ID — Vercel org id (CI)
- VERCEL_PROJECT_ID — Vercel project id (CI)

Where to set them
- Vercel project environment variables:
  - Vercel dashboard → Projects → select project → Settings → Environment Variables → Add
  - Set names exactly as above. Mark secrets as "Environment Variable" (do not share values here).

- GitHub repository secrets (for CI):
  - GitHub repo → Settings → Secrets and variables → Actions → New repository secret
  - Add the secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEYNAR_API_KEY, VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID

Security note
- Never paste secret values into chat. Use the Vercel or GitHub UI as above.

Acceptance checklist for scaffold branch
- README.md added with env var instructions.
- schema.sql added (Supabase-ready).
- Two API stubs added (src/pages/api/articles/index.ts and src/pages/api/articles/[slug].ts) using process.env guards.
- GitHub Actions workflow file added (.github/workflows/deploy-vercel.yml).
- All files committed on branch `scaffold/base-mini-kit` (PR will be opened after you confirm).
