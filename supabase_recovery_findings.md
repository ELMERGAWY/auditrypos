# Supabase recovery findings

Date: 2026-08-15

## New project reference

- New Supabase URL: `https://uwdjijaqawnlcoyaorcr.supabase.co`.
- New project ref: `uwdjijaqawnlcoyaorcr`.
- The endpoint is reachable over HTTPS and returns the expected Supabase gateway response with `sb-project-ref: uwdjijaqawnlcoyaorcr`.
- `supabase/config.toml` was updated locally to the new ref.
- Local `.env` was updated but is now removed from Git tracking; it remains on disk for local use. Vercel must be updated separately because no Vercel project metadata or CLI credentials are present in the repository.

## Local evidence

- The previous Supabase project ref in the repository was `nmkjyweoagbblkbqavdz`; it was stale after the account/project move.
- Frontend client reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `src/integrations/supabase/client.ts`.
- Local `supabase/migrations` contains multiple files with the same 14-digit version prefix. Supabase migration history uses the timestamp as the unique id.
- Exact conflict reported by the user:
  - `20260419180000_ventro_pro_accounting_system.sql`
  - `20260419180000_ventro_pro_accounting_system_CLEAN.sql`
  - `20260419180000_ventro_pro_accounting_system_ROLLBACK.sql`
  - `20260419180000_ventro_pro_accounting_system_CLEAN_ROLLBACK.sql`
- There are many additional duplicate prefixes caused by rollback files and alternative/final variants, including `20260426250000` with eight files.
- Rollback files contain only `BEGIN; ROLLBACK;`; they must not be treated as forward migrations.
- Some alternative migration files contain destructive or placeholder SQL (for example, `DROP TABLE ... CASCADE` in the CLEAN accounting variant and multiple `DROP VIEW` variants), so they must not be applied automatically.

## Current working hypothesis

The `schema_migrations_pkey` conflict is primarily a local migration-folder problem: rollback and alternative files reuse the same timestamp that Supabase uses as a unique migration version. Separately, manual changes made in the remote SQL Editor bypass the migration history and can cause `db push` synchronization errors. Runtime `Failed to fetch` must also be checked against Vercel environment variables, especially the two frontend variables above.

## Environment-file security finding

- `.env` was tracked in Git and present in GitHub at the time of inspection. It contained only the frontend Supabase URL, project ID, and publishable key according to key-name inspection; no service-role key was found.
- The remediation removes `.env` from Git tracking, adds `.env` and `.env.*` to `.gitignore`, and keeps the local file on disk. This does not rewrite old Git history; if the publishable key is considered exposed, rotate it from the new Supabase project after Vercel is updated.

## Safety decision

Do not delete rows from `supabase_migrations.schema_migrations` blindly. Do not run `db push`, `db reset --linked`, or any migration containing `DROP ... CASCADE` until the remote migration list and live schema are backed up and compared. Prefer a clean forward-only migration directory plus `migration repair` only for verified history mismatches.
