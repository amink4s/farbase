## Quick orientation for AI code contributors

This project is a Next.js "app"-dir mini app scaffold (Next 15) for a Farcaster / Base miniapp. The goal of these instructions is to let an AI coding agent be productive immediately by pointing to the project's structure, conventions, and common code patterns.

Key facts
- Framework: Next.js (app directory), TypeScript, React 19. See `package.json` for scripts: `npm run dev`, `npm run build`, `npm start`.
- Hosting / CI expectations: Vercel. See `README.md` for the environment variable names required for deploy & server runtime.
- DB: Supabase (server-side REST usage with SERVICE_ROLE key). Schema is in `schema.sql`.

Important files / patterns to read before editing
- `app/layout.tsx` — root layout; uses `minikitConfig` and `RootProvider`.
- `app/rootProvider.tsx` — client-side provider for `@coinbase/onchainkit`; sets `NEXT_PUBLIC_ONCHAINKIT_API_KEY` usage and wallet config.
- `app/api/auth/route.ts` — demonstrates QuickAuth JWT verification (Farcaster QuickAuth). Use this as the canonical server-side authentication pattern.
- `src/pages/api/articles/index.ts` — server API stub showing Supabase REST insert flow and import-time env guards. Use this as a template for new server endpoints.
- `schema.sql` — canonical DB schema for articles and accounts; follow column names (e.g. `author_fid`, `neynar_score`).
- `minikit.config.ts` — miniapp metadata used in `generateMetadata` for fc:miniapp metadata payload.

Environment variables (exact names)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- NEYNAR_API_KEY
- VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
- NEXT_PUBLIC_ONCHAINKIT_API_KEY (client)

Conventions and expectations
- Server guards at import-time: Many API handlers assert presence of server-only env vars at module import time (see `src/pages/api/articles/index.ts`). Preserve this pattern for clear startup-time failure.
- Use Supabase REST (service role) for server-side inserts. Use `Prefer: return=representation` when you need the inserted row back (example in articles/index.ts).
- Authentication pattern: QuickAuth verification happens in `app/api/auth/route.ts` (server route). When adding endpoints that are user-specific, verify QuickAuth tokens server-side and ensure the returned `payload.sub` (Fid) matches the requested author or action.
- Client vs server components: Files with `"use client"` are client components (see `app/rootProvider.tsx` and `app/page.tsx`). Keep server-only code (Supabase service role, secret keys) out of client components.
- Metadata: `generateMetadata` in `app/layout.tsx` uses `minikitConfig` to generate a `fc:miniapp` JSON payload required by the mini app host. If changing metadata, update `minikit.config.ts`.

External dependencies and integration points
- @coinbase/onchainkit (MiniKit + Wallet) — configured in `RootProvider` and used in UI components.
- @farcaster/quick-auth — server-side JWT verification in `app/api/auth/route.ts`.
- Supabase REST — server-side DB operations; `schema.sql` shows table shapes.
- Neynar — moderation/scoring expected to run server-side before inserting articles (see TODO comments in `src/pages/api/articles/index.ts`).

How to implement a new server endpoint (example checklist)
1. Add file under `src/pages/api/...` (for pages-based API) or `app/api/.../route.ts` (app router). Follow the pattern in `src/pages/api/articles/index.ts`.
2. At module top, guard required env vars (fail-fast at import time).
3. Validate method and request body fields; return 400 for missing fields and 405 for unsupported methods.
4. If action requires a user, verify QuickAuth token via the pattern in `app/api/auth/route.ts` and ensure FID matches.
5. Perform server-side calls (Neynar, Supabase REST). Use fetch with `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` and `apikey` header as shown.
6. Return clear status codes: 201 on create, 200 on success, 400/401/405/500 as appropriate. Log errors to console for server debugging.

Prompt examples for codex-like tasks
- "Add a POST `/api/articles` endpoint that mirrors the structure of `src/pages/api/articles/index.ts` but also records `neynar_score` by calling `NEYNAR_API_KEY` endpoint and sets `published=true` when score > 0.8. Validate QuickAuth token server-side and ensure `author_fid` matches the token's `sub`."
- "Refactor `app/rootProvider.tsx` to accept a telemetry flag via NEXT_PUBLIC_ENABLE_TELEMETRY and wrap OnchainKitProvider with a simple analytics hook (non-secret). Keep client-only pattern and do not leak secret keys."

If you change runtime behavior, note these verifications
- Running locally: `npm run dev` (Next dev server). The app uses Next app-dir routing; test API routes via curl or browser with proper Authorization headers for QuickAuth endpoints.
- Build: `npm run build` then `npm start` for production emulation.

When in doubt: refer to these three files first
- `app/api/auth/route.ts` — QuickAuth verification example.
- `src/pages/api/articles/index.ts` — server-side Supabase pattern and env guards.
- `schema.sql` — expected DB table shapes and column names.

Please review and tell me if you'd like more examples (e.g., exact fetch payloads for Neynar or a template PR description). If anything above is unclear or missing, say which parts you want expanded.
