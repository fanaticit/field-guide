-- ============================================================
-- Migration: 20260818000003 — goal_items
-- Sub-tasks / checklist items within a personal goal.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.goal_items (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     UUID    NOT NULL REFERENCES public.personal_goals(id) ON DELETE CASCADE,
  -- Type of action required
  item_type   TEXT    NOT NULL
              CHECK (item_type IN ('hunt', 'craft_armour', 'craft_weapon', 'upgrade', 'custom')),
  label       TEXT    NOT NULL,
  -- Optional details (e.g. monster id, weapon type id, armour slot)
  detail_json JSONB,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  sort_order  INT     NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_items_goal_id     ON public.goal_items(goal_id);
CREATE INDEX idx_goal_items_is_complete ON public.goal_items(is_complete);

-- ── Row Level Security ──────────────────────────────────────
-- Access is inherited via the parent goal's ownership.
ALTER TABLE public.goal_items ENABLE ROW LEVEL SECURITY;

-- Select: user owns the parent goal
CREATE POLICY "goal_items_select_own"
  ON public.goal_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.personal_goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
  );

CREATE POLICY "goal_items_insert_own"
  ON public.goal_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.personal_goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
  );

CREATE POLICY "goal_items_update_own"
  ON public.goal_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.personal_goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
  );

CREATE POLICY "goal_items_delete_own"
  ON public.goal_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.personal_goals g
      WHERE g.id = goal_id AND g.user_id = auth.uid()
    )
  );
