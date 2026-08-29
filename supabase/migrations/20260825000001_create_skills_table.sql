-- ============================================================
-- Migration: 20260825000001 — skills table
-- Runtime-editable skills database. Seeded from hc_data.
-- Admins can add, edit and soft-delete skills.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.skills (
  id            TEXT        PRIMARY KEY,
  name          TEXT        NOT NULL,
  name_ja       TEXT,
  category      TEXT        NOT NULL DEFAULT 'general'
                CHECK (category IN ('attack', 'critical', 'defense', 'survival', 'general', 'status', 'utility', 'health')),
  -- Which games this skill appears in (e.g. '{mhn}', '{mhn,mho}')
  games         TEXT[]      NOT NULL DEFAULT '{mhn}',
  -- Per-game max levels — e.g. {"mhn": 5, "mho": 3}
  max_levels    JSONB       NOT NULL DEFAULT '{}',
  -- Soft delete — hidden from game UI but kept in DB
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  icon          TEXT,
  -- Per-game sort orders
  sort_orders   JSONB       NOT NULL DEFAULT '{}',
  description   TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_skills_is_active ON public.skills(is_active);
CREATE INDEX IF NOT EXISTS idx_skills_category  ON public.skills(category);
CREATE INDEX IF NOT EXISTS idx_skills_games     ON public.skills USING GIN(games);

-- Automatic updated_at timestamp trigger
CREATE TRIGGER skills_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read active skills
CREATE POLICY "skills_select_active"
  ON public.skills FOR SELECT
  USING (is_active = TRUE);

-- Admins can read ALL skills (including inactive)
CREATE POLICY "skills_select_admin"
  ON public.skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can insert
CREATE POLICY "skills_insert_admin"
  ON public.skills FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update
CREATE POLICY "skills_update_admin"
  ON public.skills FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete
CREATE POLICY "skills_delete_admin"
  ON public.skills FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
