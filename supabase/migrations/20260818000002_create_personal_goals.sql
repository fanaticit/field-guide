-- ============================================================
-- Migration: 20260818000002 — personal_goals
-- Personal hunter goals / challenge todos. Private to owner.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.personal_goals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_id         TEXT        NOT NULL CHECK (game_id IN ('mhn', 'mho')),
  title           TEXT        NOT NULL,
  description     TEXT,
  goal_type       TEXT        NOT NULL CHECK (goal_type IN ('hunt', 'build', 'story', 'custom')),
  -- Optional: which monster this goal targets (references core monster id)
  target_monster_id TEXT,
  -- Optional: which weapon type this goal involves
  target_weapon_type_id TEXT,
  status          TEXT        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'abandoned')),
  -- Ordering within a user's goal list
  sort_order      INT         NOT NULL DEFAULT 0,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_personal_goals_user_id ON public.personal_goals(user_id);
CREATE INDEX idx_personal_goals_game_id ON public.personal_goals(game_id);
CREATE INDEX idx_personal_goals_status  ON public.personal_goals(status);

CREATE TRIGGER personal_goals_updated_at
  BEFORE UPDATE ON public.personal_goals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.personal_goals ENABLE ROW LEVEL SECURITY;

-- Users can only see their own goals
CREATE POLICY "personal_goals_select_own"
  ON public.personal_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "personal_goals_insert_own"
  ON public.personal_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "personal_goals_update_own"
  ON public.personal_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "personal_goals_delete_own"
  ON public.personal_goals FOR DELETE
  USING (auth.uid() = user_id);
