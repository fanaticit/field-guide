-- ============================================================
-- Migration: 20260825000002 — armour_pieces table
-- Runtime-editable armour pieces database. Seeded from hc_data.
-- Stores skills and properties per monster, game, and slot.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.armour_pieces (
  id            TEXT        PRIMARY KEY, -- e.g. 'mhn:great_jagras:helm'
  game          TEXT        NOT NULL DEFAULT 'mhn',
  monster_id    TEXT        NOT NULL REFERENCES public.monsters(id) ON DELETE CASCADE,
  slot          TEXT        NOT NULL CHECK (slot IN ('helm', 'chest', 'gloves', 'waist', 'greaves')),
  skills        JSONB       NOT NULL DEFAULT '[]', -- Array of { "id": "water_attack", "level": 2 }
  driftsmelt_slots INT      NOT NULL DEFAULT 0,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_armour_pieces_game_monster_slot UNIQUE (game, monster_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_armour_pieces_game_monster ON public.armour_pieces(game, monster_id);
CREATE INDEX IF NOT EXISTS idx_armour_pieces_slot ON public.armour_pieces(slot);
CREATE INDEX IF NOT EXISTS idx_armour_pieces_skills ON public.armour_pieces USING GIN(skills);

-- Trigger for updated_at
CREATE TRIGGER armour_pieces_updated_at
  BEFORE UPDATE ON public.armour_pieces
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.armour_pieces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "armour_pieces_select_all"
  ON public.armour_pieces FOR SELECT
  USING (true);

CREATE POLICY "armour_pieces_insert_admin"
  ON public.armour_pieces FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "armour_pieces_update_admin"
  ON public.armour_pieces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "armour_pieces_delete_admin"
  ON public.armour_pieces FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
