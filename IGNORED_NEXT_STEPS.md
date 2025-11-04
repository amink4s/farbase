# Ignored / Deferred Next Steps (tracked)

This file records suggested next steps (past & future) that have been recommended but not yet acted on. After each session I will append new items if you choose to ignore them so you have a single place tracking deferred work for later prioritization.

=== Snapshot: 2025-11-04 ===

High-priority items (recommended for MVP or near-term):

- Apply DB migrations to your Supabase instance (run the SQL in `migrations/*.sql` or use the provided `scripts/apply_migrations.sh`). (REQUIRED to enable contributions & user_points in production)
- Schedule a nightly recompute job for `user_points` (run `npm run recompute:points`) using a cron runner (Vercel Cron, GitHub Actions schedule, or a small server).

Medium / nice-to-have (deferred):

- Create a Supabase RPC (stored procedure) for atomic increment/upsert of `user_points` to avoid race conditions and multiple REST calls.
- Add RLS policies and tighter Supabase security rules for production (particularly if exposing any client-side queries).
- Add a reviewer management UI (promote/demote `is_reviewer`) and wire it into the admin accounts page.
- Add a reviewer dashboard to surface pending edit proposals and filters (by newest, by article, by contributor).
- Add UI badges and filters to show `vetted` state across article lists and search results.

Lower priority / future enhancements:

- Add multi-approver workflows (consensus / quorum) for sensitive edits.
- Add audit snapshots for article versions (store full article snapshots when edits are approved for historical exports).
- Implement airdrop allocation calculator that converts `user_points` into token allocations and exports final CSV with token amounts.
- Add CI job to run migrations/tests in PRs and enforce schema changes.
- Add monitoring/alerts for failed recompute or Supabase REST errors.

Notes:
- I'll append this file when you explicitly ignore a recommended follow-up in future interactions (as requested).
- If you want some of these moved into the active `todo` board, tell me which ones and I'll implement the minimal required code/tests/docs.
