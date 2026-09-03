-- ============================================================
-- Migration: 20260901000001 — Create all storage buckets & policies
-- Creates public buckets for:
--   1. monsters (Monster icons/portraits)
--   2. visages  (MHO Visage large cards and small icons)
--   3. buddies  (MHO Buddy companion portraits)
-- ============================================================

-- 1. Create buckets if they do not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('monsters', 'monsters', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('visages',  'visages',  true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('buddies',  'buddies',  true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- 2. Public Read policies for all 3 buckets
DO $$
BEGIN
  -- monsters public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read Monsters Storage'
  ) THEN
    CREATE POLICY "Public Read Monsters Storage"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'monsters');
  END IF;

  -- visages public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read Visages Storage'
  ) THEN
    CREATE POLICY "Public Read Visages Storage"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'visages');
  END IF;

  -- buddies public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read Buddies Storage'
  ) THEN
    CREATE POLICY "Public Read Buddies Storage"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'buddies');
  END IF;

  -- Admin / Upload policies for monsters
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin All Monsters Storage'
  ) THEN
    CREATE POLICY "Admin All Monsters Storage"
      ON storage.objects FOR ALL
      USING (
        bucket_id = 'monsters' AND
        (auth.role() = 'authenticated' OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
      )
      WITH CHECK (
        bucket_id = 'monsters' AND
        (auth.role() = 'authenticated' OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
      );
  END IF;

  -- Admin / Upload policies for visages
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin All Visages Storage'
  ) THEN
    CREATE POLICY "Admin All Visages Storage"
      ON storage.objects FOR ALL
      USING (
        bucket_id = 'visages' AND
        (auth.role() = 'authenticated' OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
      )
      WITH CHECK (
        bucket_id = 'visages' AND
        (auth.role() = 'authenticated' OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
      );
  END IF;

  -- Admin / Upload policies for buddies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin All Buddies Storage'
  ) THEN
    CREATE POLICY "Admin All Buddies Storage"
      ON storage.objects FOR ALL
      USING (
        bucket_id = 'buddies' AND
        (auth.role() = 'authenticated' OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
      )
      WITH CHECK (
        bucket_id = 'buddies' AND
        (auth.role() = 'authenticated' OR EXISTS (
          SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        ))
      );
  END IF;
END $$;
