# Supabase Setup Guide — Field Guide

## Project Setup

The Field Guide uses Supabase for authentication, database, and Row Level Security.
Migrations are in `supabase/migrations/` and can be applied in order.

---

## Quick Start

### 1. Install the Supabase CLI

```bash
brew install supabase/tap/supabase
```

Or via npm:
```bash
npm install -g supabase
```

### 2. Initialise the project

Run this **once** from the project root:

```bash
supabase init
```

This creates the `supabase/` config directory (`.gitignore` will be updated automatically).

### 3. Link to your Supabase project

```bash
supabase login
supabase link --project-ref <your-project-ref>
```

Your project ref is found in the Supabase dashboard URL: `app.supabase.com/project/<ref>`.

### 4. Apply migrations

```bash
supabase db push
```

This runs all files in `supabase/migrations/` in order against your remote database.

### 5. Add environment variables

Create a `.env.local` file (already in `.gitignore`):

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are found in: **Supabase Dashboard → Project Settings → API**.

---

## Migration Inventory

| File | Creates |
|------|---------|
| `20260818000001_create_profiles.sql` | `profiles` table + auto-create trigger |
| `20260818000002_create_personal_goals.sql` | `personal_goals` table |
| `20260818000003_create_goal_items.sql` | `goal_items` table |
| `20260818000004_create_community_builds.sql` | `community_builds` + `vote_on_build()` |
| `20260818000005_create_community_challenges.sql` | `community_challenges` + `challenge_adoptions` + `vote_on_challenge()` |

---

## Row Level Security Summary

| Table | Anonymous | Authenticated (own) | Authenticated (others) |
|-------|-----------|--------------------|-----------------------|
| `profiles` | Read all | Read + Update own | Read all |
| `personal_goals` | None | Full CRUD | None |
| `goal_items` | None | Full CRUD (via parent) | None |
| `community_builds` | Read published | Full CRUD own | Read published |
| `community_challenges` | Read published | Full CRUD own | Read published |
| `challenge_adoptions` | None | Full CRUD own | None |

---

## Local Development

To run Supabase locally with Docker:

```bash
supabase start
```

This starts a local Postgres + Supabase stack. Your local connection details
will be printed on startup. Update `.env.local` to point to the local instance
while developing offline.

```bash
supabase stop   # stop local instance
supabase db reset   # reset local DB and re-apply all migrations
```

---

## Adding New Migrations

Always create new migration files with a timestamp prefix:

```bash
supabase migration new <name>
# Creates: supabase/migrations/YYYYMMDDHHMMSS_<name>.sql
```

Never edit existing migration files — create new ones for changes.
