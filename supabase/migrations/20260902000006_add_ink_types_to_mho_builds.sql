-- Add selected ink types to mho_builds
ALTER TABLE public.mho_builds
  ADD COLUMN core_ink_type TEXT,
  ADD COLUMN visage_2_ink_type TEXT,
  ADD COLUMN visage_3_ink_type TEXT,
  ADD COLUMN visage_4_ink_type TEXT,
  ADD COLUMN visage_5_ink_type TEXT;
