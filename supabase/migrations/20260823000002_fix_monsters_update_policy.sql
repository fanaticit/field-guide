-- Fix: ensure UPDATE policy also has WITH CHECK so Supabase REST layer
-- accepts the update payload regardless of the games value.
DROP POLICY IF EXISTS "monsters_update_admin" ON public.monsters;

CREATE POLICY "monsters_update_admin"
  ON public.monsters FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );
