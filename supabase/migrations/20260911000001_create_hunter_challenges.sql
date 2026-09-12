-- ============================================================
-- Migration: 20260911000001 — hunter_challenges table
-- Personal challenge tracker for hunters. One row per challenge,
-- evolving from 'crafting' → 'upgrading' → 'completed' in-place.
-- Phase 1 supports armour_piece challenges only.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hunter_challenges (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Challenge classification (only 'armour_piece' in Phase 1)
  challenge_type    TEXT        NOT NULL DEFAULT 'armour_piece'
                    CHECK (challenge_type IN ('armour_piece', 'weapon', 'visage_set', 'full_build')),
  game              TEXT        NOT NULL DEFAULT 'mho',

  -- ── Armour-specific fields ─────────────────────────────────
  armour_piece_id   TEXT        REFERENCES public.armour_pieces(id) ON DELETE CASCADE,
  monster_id        TEXT        REFERENCES public.monsters(id)      ON DELETE SET NULL,
  armour_slot       TEXT        CHECK (armour_slot IN ('helm', 'chest', 'gloves', 'waist', 'greaves')),
  set_variant       TEXT,         -- e.g. 'I', 'alpha'
  set_name          TEXT,         -- display name of the set (denormalised for quick reads)
  piece_image       TEXT,         -- cached piece image URL (denormalised)
  set_icon          TEXT,         -- cached set/monster icon URL (denormalised)
  monster_name      TEXT,         -- cached monster name (denormalised)
  
  -- ── Upgrade progression ────────────────────────────────────
  -- The challenge starts at craft_rarity (usually 1) and the
  -- hunter works up to max_rarity (e.g. 12).
  -- current_rarity tracks the highest tier they have reached.
  craft_rarity      INTEGER     NOT NULL DEFAULT 1,   -- Rarity at which piece is crafted
  current_rarity    INTEGER     NOT NULL DEFAULT 0,   -- 0 = not yet crafted
  max_rarity        INTEGER     NOT NULL DEFAULT 12,  -- The highest upgrade target

  -- ── Status ────────────────────────────────────────────────
  -- crafting  = not yet crafted at all
  -- upgrading = crafted, working toward higher rarity
  -- completed = reached max_rarity (or hunter marked as done)
  -- abandoned = hunter cancelled the challenge
  status            TEXT        NOT NULL DEFAULT 'crafting'
                    CHECK (status IN ('crafting', 'upgrading', 'completed', 'abandoned')),
  completed_at      TIMESTAMPTZ,

  -- ── Meta ──────────────────────────────────────────────────
  sort_order        INTEGER     NOT NULL DEFAULT 0,
  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One challenge per piece per hunter (prevent duplicates for same active challenge)
  CONSTRAINT uq_hunter_challenge_piece UNIQUE (user_id, armour_piece_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_hunter_challenges_user_status
  ON public.hunter_challenges(user_id, status);

CREATE INDEX IF NOT EXISTS idx_hunter_challenges_user_type
  ON public.hunter_challenges(user_id, challenge_type);

CREATE INDEX IF NOT EXISTS idx_hunter_challenges_monster
  ON public.hunter_challenges(monster_id);

CREATE INDEX IF NOT EXISTS idx_hunter_challenges_armour_piece
  ON public.hunter_challenges(armour_piece_id);

-- Trigger for updated_at
CREATE TRIGGER hunter_challenges_updated_at
  BEFORE UPDATE ON public.hunter_challenges
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.hunter_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hunter_challenges_select_own"
  ON public.hunter_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "hunter_challenges_insert_own"
  ON public.hunter_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "hunter_challenges_update_own"
  ON public.hunter_challenges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "hunter_challenges_delete_own"
  ON public.hunter_challenges FOR DELETE
  USING (auth.uid() = user_id);
