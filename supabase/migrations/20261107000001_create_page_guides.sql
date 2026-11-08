-- ============================================================
-- Migration: 20261107000001 — create page guides table
-- Stores page tutorial/guide metadata such as YouTube video links,
-- titles, and descriptions (e.g. for '/challenges/adventurers').
-- Readable by everyone; editable only by admins.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.page_guides (
  page_id      TEXT PRIMARY KEY,
  youtube_url  TEXT,
  title        TEXT,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.page_guides ENABLE ROW LEVEL SECURITY;

-- Anyone can view page guides (public select)
CREATE POLICY "page_guides_select_all"
  ON public.page_guides FOR SELECT
  USING (true);

-- Only admins can insert page guides
CREATE POLICY "page_guides_insert_admin"
  ON public.page_guides FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update page guides
CREATE POLICY "page_guides_update_admin"
  ON public.page_guides FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete page guides
CREATE POLICY "page_guides_delete_admin"
  ON public.page_guides FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Seed row for adventurers
INSERT INTO public.page_guides (page_id, youtube_url, title, description)
VALUES (
  'adventurers',
  NULL,
  'Adventurer System Guide',
  'Watch this video overview to learn more about Outlanders adventurers, roles, recruitment, and insight progression.'
)
ON CONFLICT (page_id) DO NOTHING;
