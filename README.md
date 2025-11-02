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

## Roadmap & MVP Checklist

Follow these developer tasks to deliver the MVP focused on tokens/projects pages:

1. Add DB migrations for `article_edits`, `contributors`, and `airdrops` (see `ROADMAP.md`).
2. Ensure environment variables are set locally or in CI: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEYNAR_API_KEY`, `NEXT_PUBLIC_ONCHAINKIT_API_KEY`.
3. Run DB migrations / apply `schema.sql` and new migrations in Supabase.
4. Implement server-side QuickAuth verification for write endpoints (use `app/api/auth/route.ts` as canonical example).
5. Wire Neynar server-side scoring for new articles/edits and persist `neynar_score`.
6. Implement `POST /api/articles` and `POST /api/articles/:slug/edits` with proper status codes and error handling.
7. Add article view and create/edit pages in `app/` (client components where needed). Keep secrets server-side.
8. Implement `article_edits` history UI and a contributors list per article.
9. Provide an admin export endpoint to get eligible FIDs for airdrops (`/api/airdrop/eligibility`).
10. Add basic tests for APIs and run `npm run build` to validate types.

If you want, I can start by creating the migration SQL and scaffolding the `POST /api/articles` QuickAuth + Neynar integration. Tell me which task to pick first.
