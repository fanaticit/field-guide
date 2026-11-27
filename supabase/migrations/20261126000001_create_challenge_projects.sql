-- ============================================================
-- Migration: 20261126000001 — Challenge projects
-- A project groups challenges, e.g. everything needed for one build from the planner:
-- weapon, 5 armour pieces, adventurer, buddy and visage cards.
--   * challenge_projects: one row per project (name, optional source build, default targets)
--   * challenge_project_items: links a project to hunter_challenges rows, each with the level
--     that counts as "done" for this project (target_level). A challenge can belong to several
--     projects (the challenge rows themselves stay unique per item per hunter).
--   * added_by_project marks challenges the project created, so closing a project can remove
--     unfinished ones it added without touching challenges the hunter already had.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.challenge_projects (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT        NOT NULL,
  build_id              UUID        REFERENCES public.mho_builds(id) ON DELETE SET NULL,
  weapon_target_rarity  INTEGER,
  armour_target_rarity  INTEGER,
  sort_order            INTEGER     NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_challenge_projects_user ON public.challenge_projects(user_id);

DROP TRIGGER IF EXISTS challenge_projects_updated_at ON public.challenge_projects;
CREATE TRIGGER challenge_projects_updated_at
  BEFORE UPDATE ON public.challenge_projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.challenge_project_items (
  project_id        UUID        NOT NULL REFERENCES public.challenge_projects(id) ON DELETE CASCADE,
  challenge_id      UUID        NOT NULL REFERENCES public.hunter_challenges(id)  ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- where the item sits in the build: weapon, helm, chest, gloves, waist, greaves,
  -- adventurer, buddy, core_visage, visage_2 … visage_5
  slot              TEXT,
  -- level that counts as done for this project (rarity for weapon/armour,
  -- 1-4 Fine→Superior for visages, insight goal for adventurers, 1-3 for buddies)
  target_level      INTEGER     NOT NULL DEFAULT 1,
  added_by_project  BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order        INTEGER     NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, challenge_id)
);
CREATE INDEX IF NOT EXISTS idx_challenge_project_items_user ON public.challenge_project_items(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_project_items_challenge ON public.challenge_project_items(challenge_id);

ALTER TABLE public.challenge_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_project_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "challenge_projects_own" ON public.challenge_projects;
CREATE POLICY "challenge_projects_own" ON public.challenge_projects FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "challenge_project_items_own" ON public.challenge_project_items;
CREATE POLICY "challenge_project_items_own" ON public.challenge_project_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.challenge_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.hunter_challenges c WHERE c.id = challenge_id AND c.user_id = auth.uid())
  );

COMMIT;
