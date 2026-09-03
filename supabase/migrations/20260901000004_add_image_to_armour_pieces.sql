-- ============================================================
-- Migration: 20260901000004 — Add image to armour_pieces & create armour storage bucket
-- ============================================================

-- 1. Add image column to public.armour_pieces
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'armour_pieces'
      AND column_name = 'image'
  ) THEN
    ALTER TABLE public.armour_pieces 
      ADD COLUMN image TEXT;
  END IF;
END $$;

-- 2. Create 'armour' public storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('armour', 'armour', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- 3. Storage Policies for 'armour' bucket
DO $$
BEGIN
  -- Public Read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read Armour Storage'
  ) THEN
    CREATE POLICY "Public Read Armour Storage"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'armour');
  END IF;

  -- Admin / Authenticated Upload
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin All Armour Storage'
  ) THEN
    CREATE POLICY "Admin All Armour Storage"
      ON storage.objects FOR ALL
      USING (
        bucket_id = 'armour' AND
        (auth.role() = 'authenticated' OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
      )
      WITH CHECK (
        bucket_id = 'armour' AND
        (auth.role() = 'authenticated' OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
      );
  END IF;
END $$;
