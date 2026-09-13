-- ============================================================
-- Migration: 20260912000004 — Add Adventurer and Buddy challenges
-- Expands hunter_challenges to track MHO Adventurer recruitment and Buddy recruitment goals
-- ============================================================

ALTER TABLE public.hunter_challenges
  DROP CONSTRAINT IF EXISTS hunter_challenges_challenge_type_check;

ALTER TABLE public.hunter_challenges
  ADD CONSTRAINT hunter_challenges_challenge_type_check
  CHECK (challenge_type IN ('armour_piece', 'weapon', 'visage_set', 'adventurer', 'buddy', 'full_build'));

ALTER TABLE public.hunter_challenges
  ADD COLUMN IF NOT EXISTS adventurer_id TEXT REFERENCES public.adventurers(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS buddy_id      TEXT REFERENCES public.buddies(id)      ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_hunter_challenges_adventurer
  ON public.hunter_challenges(adventurer_id);

CREATE INDEX IF NOT EXISTS idx_hunter_challenges_buddy
  ON public.hunter_challenges(buddy_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hunter_challenge_user_adventurer
  ON public.hunter_challenges(user_id, adventurer_id)
  WHERE adventurer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hunter_challenge_user_buddy
  ON public.hunter_challenges(user_id, buddy_id)
  WHERE buddy_id IS NOT NULL;
