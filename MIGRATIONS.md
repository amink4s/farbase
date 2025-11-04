# Migrations and Admin Setup

This document explains the SQL migrations in `migrations/`, how to apply them to your Supabase/Postgres instance, and how to seed an admin account.

Required environment variables

- `SUPABASE_URL` — your Supabase project URL (used by server APIs).
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only, keep secret).
- `DATABASE_URL` — Postgres connection string (used by psql-based migration script). This is typically available in your Supabase project settings.

Migrations

The `migrations/` folder contains ordered SQL files to evolve the database schema. Current files:

- `001_create_article_edits.sql` — creates `article_edits` table
- `002_create_webhook_events.sql` — creates `webhook_events` table
- `003_add_is_admin_to_accounts.sql` — adds `is_admin` boolean to `accounts`

Applying migrations (recommended)

Option A — Use psql (recommended for automated runs):

1. Ensure `DATABASE_URL` points to your Postgres database and `psql` is installed locally or in your CI environment.
2. Run the helper script which applies migrations in lexical order:

```bash
DATABASE_URL=postgres://... npm run migrate:psql
```

The script will run each `migrations/*.sql` file in order. Review the files before running.

Option B — Manual via Supabase SQL editor:

1. Open Supabase dashboard -> SQL editor.
2. Copy the contents of each `migrations/*.sql` file (in order) and run them.

Seeding an admin account

You can seed an admin account so the in-app admin UI can be used.

Run this SQL in your DB (replace `<fid>` and `<display_name>`):

```sql
INSERT INTO accounts (fid, display_name, is_admin)
VALUES ('<fid>', '<display_name>', true)
ON CONFLICT (fid) DO UPDATE SET is_admin = true;
```

Or use the admin API endpoint (`/api/admin/accounts`) once you have QuickAuth and admin credentials.

Environment fallback and emergency access

- You can set an emergency allowlist via `ADMIN_FIDS` or `ADMIN_FID` environment variable (comma-separated FIDs). When present, this takes priority over the DB `is_admin` flag.

Notes

- Do NOT commit `SUPABASE_SERVICE_ROLE_KEY` or any secrets into source control.
- Running migrations is irreversible in production. Always back up important data.

If you want, I can wire a small Node-based migration runner that uses `pg` and the `SUPABASE_SERVICE_ROLE_KEY` to execute migrations directly. That requires configuring the DB connection string in env.
