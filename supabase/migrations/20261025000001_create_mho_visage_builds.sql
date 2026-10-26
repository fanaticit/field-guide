-- ============================================================
-- Migration: 20261025000001 — mho_visage_builds
-- Standalone, shareable Visage loadouts (Core + 4 slots, 12pt cap).
-- Built on the Visage page and browsed at /armory/visages.
-- Future: mho_builds.visage_build_id will reference this table.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mho_visage_builds (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id           UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title               TEXT        NOT NULL,
  description         TEXT,

  -- ── Visage slots ───────────────────────────────────────
  core_visage_id      TEXT        REFERENCES public.visages(id) ON DELETE SET NULL,
  visage_2_id         TEXT        REFERENCES public.visages(id) ON DELETE SET NULL,
  visage_3_id         TEXT        REFERENCES public.visages(id) ON DELETE SET NULL,
  visage_4_id         TEXT        REFERENCES public.visages(id) ON DELETE SET NULL,
  visage_5_id         TEXT        REFERENCES public.visages(id) ON DELETE SET NULL,

  -- ── Selected ink per slot ──────────────────────────────
  core_ink_type       TEXT,
  visage_2_ink_type   TEXT,
  visage_3_ink_type   TEXT,
  visage_4_ink_type   TEXT,
  visage_5_ink_type   TEXT,

  total_points        INT         NOT NULL DEFAULT 0 CHECK (total_points >= 0 AND total_points <= 12),

  -- ── Community signals ──────────────────────────────────
  upvotes             INT         NOT NULL DEFAULT 0,
  downvotes           INT         NOT NULL DEFAULT 0,
  is_published        BOOLEAN     NOT NULL DEFAULT false,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mho_visage_builds_author_id    ON public.mho_visage_builds(author_id);
CREATE INDEX IF NOT EXISTS idx_mho_visage_builds_is_published ON public.mho_visage_builds(is_published);

CREATE TRIGGER mho_visage_builds_updated_at
  BEFORE UPDATE ON public.mho_visage_builds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.mho_visage_builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mho_visage_builds_select_published"
  ON public.mho_visage_builds FOR SELECT
  USING (is_published = true OR author_id = auth.uid());

CREATE POLICY "mho_visage_builds_insert_own"
  ON public.mho_visage_builds FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "mho_visage_builds_update_own"
  ON public.mho_visage_builds FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "mho_visage_builds_delete_own"
  ON public.mho_visage_builds FOR DELETE
  USING (auth.uid() = author_id);
