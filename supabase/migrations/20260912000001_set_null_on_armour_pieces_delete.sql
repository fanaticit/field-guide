-- Migration: 20260912000001 — Set null on armour pieces delete in mho_builds
-- Ensures deleting an armour piece does not fail with foreign key restrict constraint on mho_builds

DO $$
BEGIN
  -- 1. helm_piece_id
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mho_builds_helm_piece_id_fkey') THEN
    ALTER TABLE public.mho_builds DROP CONSTRAINT mho_builds_helm_piece_id_fkey;
  END IF;
  ALTER TABLE public.mho_builds ADD CONSTRAINT mho_builds_helm_piece_id_fkey
    FOREIGN KEY (helm_piece_id) REFERENCES public.armour_pieces(id) ON DELETE SET NULL;

  -- 2. chest_piece_id
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mho_builds_chest_piece_id_fkey') THEN
    ALTER TABLE public.mho_builds DROP CONSTRAINT mho_builds_chest_piece_id_fkey;
  END IF;
  ALTER TABLE public.mho_builds ADD CONSTRAINT mho_builds_chest_piece_id_fkey
    FOREIGN KEY (chest_piece_id) REFERENCES public.armour_pieces(id) ON DELETE SET NULL;

  -- 3. gloves_piece_id
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mho_builds_gloves_piece_id_fkey') THEN
    ALTER TABLE public.mho_builds DROP CONSTRAINT mho_builds_gloves_piece_id_fkey;
  END IF;
  ALTER TABLE public.mho_builds ADD CONSTRAINT mho_builds_gloves_piece_id_fkey
    FOREIGN KEY (gloves_piece_id) REFERENCES public.armour_pieces(id) ON DELETE SET NULL;

  -- 4. waist_piece_id
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mho_builds_waist_piece_id_fkey') THEN
    ALTER TABLE public.mho_builds DROP CONSTRAINT mho_builds_waist_piece_id_fkey;
  END IF;
  ALTER TABLE public.mho_builds ADD CONSTRAINT mho_builds_waist_piece_id_fkey
    FOREIGN KEY (waist_piece_id) REFERENCES public.armour_pieces(id) ON DELETE SET NULL;

  -- 5. greaves_piece_id
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mho_builds_greaves_piece_id_fkey') THEN
    ALTER TABLE public.mho_builds DROP CONSTRAINT mho_builds_greaves_piece_id_fkey;
  END IF;
  ALTER TABLE public.mho_builds ADD CONSTRAINT mho_builds_greaves_piece_id_fkey
    FOREIGN KEY (greaves_piece_id) REFERENCES public.armour_pieces(id) ON DELETE SET NULL;
END $$;
