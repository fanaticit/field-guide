-- ============================================================
-- Migration: 20260905000002 — Create weapons storage bucket & ensure rarity column
-- ============================================================

-- 1. Create weapons storage bucket if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('weapons', 'weapons', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- 2. Storage Policies for weapons bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read Weapons Storage'
  ) THEN
    CREATE POLICY "Public Read Weapons Storage"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'weapons');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin All Weapons Storage'
  ) THEN
    CREATE POLICY "Admin All Weapons Storage"
      ON storage.objects FOR ALL
      USING (
        bucket_id = 'weapons' AND
        (auth.role() = 'authenticated' OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
      )
      WITH CHECK (
        bucket_id = 'weapons' AND
        (auth.role() = 'authenticated' OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
      );
  END IF;
END $$;

-- 3. Ensure rarity column exists on public.weapons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weapons'
      AND column_name = 'rarity'
  ) THEN
    ALTER TABLE public.weapons ADD COLUMN rarity INT NOT NULL DEFAULT 1;
  END IF;
END $$;
