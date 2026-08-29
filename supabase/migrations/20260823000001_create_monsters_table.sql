-- ============================================================
-- Migration: 20260823000001 — monsters table
-- Runtime-editable monster database. Seeded from hc_data.
-- Admins can add, edit and soft-delete monsters.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.monsters (
  id            TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL,
  name_ja       TEXT,
  species       TEXT,
  tier          TEXT        NOT NULL DEFAULT 'low'
                CHECK (tier IN ('low', 'high', 'elder', 'small', 'collab')),
  elements      TEXT[]      NOT NULL DEFAULT '{}',
  weaknesses    TEXT[]      NOT NULL DEFAULT '{}',
  is_variant    BOOLEAN     NOT NULL DEFAULT FALSE,
  parent_id     TEXT        REFERENCES public.monsters(id),
  is_radiant    BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Which games this monster appears in (e.g. '{mhn}', '{mhn,mho}')
  games         TEXT[]      NOT NULL DEFAULT '{mhn}',
  -- Soft delete — hidden from the game UI but kept in DB
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  icon          TEXT,
  sort_order    INT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monsters_is_active  ON public.monsters(is_active);
CREATE INDEX IF NOT EXISTS idx_monsters_tier       ON public.monsters(tier);
CREATE INDEX IF NOT EXISTS idx_monsters_species    ON public.monsters(species);
CREATE INDEX IF NOT EXISTS idx_monsters_games      ON public.monsters USING GIN(games);
CREATE INDEX IF NOT EXISTS idx_monsters_parent_id  ON public.monsters(parent_id);

CREATE TRIGGER monsters_updated_at
  BEFORE UPDATE ON public.monsters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.monsters ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read active monsters
CREATE POLICY "monsters_select_active"
  ON public.monsters FOR SELECT
  USING (is_active = TRUE);

-- Admins can read ALL monsters (including inactive)
CREATE POLICY "monsters_select_admin"
  ON public.monsters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can insert
CREATE POLICY "monsters_insert_admin"
  ON public.monsters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update
CREATE POLICY "monsters_update_admin"
  ON public.monsters FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete (prefer soft-delete via is_active)
CREATE POLICY "monsters_delete_admin"
  ON public.monsters FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
