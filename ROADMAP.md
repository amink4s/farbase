# Farbase (Farpedia) Roadmap

This document describes the product vision, data model suggestions, milestones for the MVP, and an actionable checklist developers can follow to implement the wiki + rewards system.

## Vision

Farbase will be a Wikipedia-style knowledge base for the Farcaster/Base ecosystem. Every token, project, channel, and person can have a dedicated page. Contributions are tracked and, later, rewarded via an on-chain token airdrop to verified contributors.

Principles
- Open-edit model (like Wikipedia) but with moderation and owner controls.
- Clear attribution of authors and contributors for every article.
- Server-side verification of user identity using Farcaster QuickAuth.
- Moderation via Neynar scoring and human review.
- Airdrop eligibility tracked in the DB and exposed to an admin/distribution UI.

## MVP scope (Phase 1)

Limit scope to tokens / projects pages only. Core features:
- Read: View a token/project page.
- Create: Authenticated users can create a new token/project page (slug, title, body, metadata).
- Edit: Propose edits (saved as an edit record). Simple inline edits allowed for trusted users.
- Attribution: Store `author_fid` and record contributions.
- Moderation: Server-side Neynar score stored as `neynar_score` and used to flag content.
- Owner controls: Project owners (based on owner_fid metadata or a claim flow) can accept/reject edits for their project.

## Data model (suggested additions)

Existing tables: `articles`, `accounts` (see `schema.sql`). Suggested tables:

- `article_edits`
  - id uuid PK
  - article_id uuid REFERENCES articles(id)
  - author_fid text NOT NULL (editor's Farcaster fid)
  - diff jsonb or body text (full body or structured diff)
  - summary text (change summary)
  - created_at timestamptz DEFAULT now()
  - approved boolean DEFAULT false
  - reviewer_fid text NULL

- `contributors` (or `article_contributors`)
  - id uuid PK
  - article_id uuid
  - fid text
  - role text (author, editor, reviewer)
  - contributions_count int DEFAULT 0
  - last_contributed_at timestamptz

- `airdrops` (tracking airdrop eligibility)
  - id uuid PK
  - fid text
  - amount numeric
  - reason text
  - assigned_by text (admin fid)
  - status text (pending, claimed, distributed)
  - created_at timestamptz

- `comments` (discussion)
  - id uuid PK
  - article_id uuid
  - author_fid text
  - body text
  - created_at timestamptz

Notes
- Use `author_fid` on `articles` as source-of-truth for the original author.
- Keep `article_edits` as the canonical edit history similar to Wikipedia's revision model.

## Permissions & flows

- Authentication: Use Farcaster QuickAuth (see `app/api/auth/route.ts`). Server must verify tokens for any operation that requires identity.
- Create/Edit: Only authenticated users can create or propose edits. Track the `author_fid` for provenance.
- Review: Edits are either auto-applied for trusted contributors (future), or go to a review queue. Owners can approve edits to their project.
- Owner claim flow: Allow project owners to claim ownership by proving control of a linked on-chain address or verifying an authoritative handle. Store `owner_fid` or owner information in article metadata.
- Moderation: For each new article/edit, call Neynar server-side to get `neynar_score`. If score < threshold, mark for manual review.

## API endpoints (initial set)

- POST /api/articles — create article (server-side QuickAuth verification + Neynar check). (See `src/pages/api/articles/index.ts`)
- GET /api/articles/:slug — fetch article
- POST /api/articles/:slug/edits — propose an edit
- GET /api/articles/:slug/edits — list edit history
- POST /api/articles/:slug/edits/:id/approve — approve edit (owner or moderator)
- GET /api/contributors?article_id=... — list contributors
- GET /api/airdrop/eligibility — admin endpoint to export eligible FIDs

## Milestones (Roadmap)

- Week 0 — Planning & schema
  - Finalize DB schema additions (edits, contributors, airdrops).
  - Add migration SQL (or run `schema.sql` changes).

- Week 1 — Core backend & auth
  - Implement `POST /api/articles` with QuickAuth verification and Supabase REST insert.
  - Add Neynar scoring call and store `neynar_score`.

- Week 2 — Read & simple UI
  - Article view page in `app/` (SSR or static as appropriate).
  - Create UI for creating and editing articles (client + server calls).

- Week 3 — Edit history & contributions
  - Implement `article_edits` table and API for edits.
  - Track contributors and add a simple contributors list to article pages.

- Week 4 — Owner claims & review workflow
  - Implement claim flow and owner approval endpoints.
  - UI for owners to review pending edits.

- Week 5 — Airdrop tooling
  - Add `airdrops` table to track eligibility.
  - Admin UI to export eligible FIDs and prepare airdrop batches.

- Week 6+ — Hardening
  - Add RLS policies, tests, rate limiting, audit logs, search, and more fine-grained reputation.

## Operational considerations

- Secrets: Keep `SUPABASE_SERVICE_ROLE_KEY` and `NEYNAR_API_KEY` server-only; never expose in client.
- DB migrations: Use `schema.sql` and apply incremental migrations for new tables.
- RLS: When allowing client-side Supabase queries in the future, configure RLS policies.
- Logging: Server API should log errors and Neynar responses for audit.

## Success metrics for MVP

- 100 created token/project pages in first month
- Contributors list per article shows author + contributors
- Exportable list of eligible FIDs for an airdrop

## Next steps (developer tasks)

1. Add DB migration SQL for `article_edits`, `contributors`, and `airdrops`.
2. Implement server-side QuickAuth verification for write endpoints (use `app/api/auth/route.ts` as example).
3. Wire Neynar API server-side and persist `neynar_score`.
4. Build article create/edit UI and edit history pages.
5. Implement owner claim & approval workflow.

---

If this plan looks good I can: create the migration SQL in `migrations/`, scaffold the CRUD APIs, or open a PR with an initial `article_edits` migration and the `POST /api/articles` QuickAuth+Neynar integration. Tell me which you'd like me to do next.
