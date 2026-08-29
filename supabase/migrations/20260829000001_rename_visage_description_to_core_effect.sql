-- ============================================================
-- Migration: 20260829000001 — Rename description to core_effect on visages
-- ============================================================

DO $$
BEGIN
  -- Rename description to core_effect if description exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'visages' 
      AND column_name = 'description'
  ) THEN
    ALTER TABLE public.visages RENAME COLUMN description TO core_effect;
  END IF;

  -- Add core_effect column if it does not exist at all
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'visages' 
      AND column_name = 'core_effect'
  ) THEN
    ALTER TABLE public.visages ADD COLUMN core_effect TEXT;
  END IF;
END $$;
