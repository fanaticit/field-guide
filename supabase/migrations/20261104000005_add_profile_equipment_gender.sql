-- ============================================================
-- Migration: 20261104000005 — profile equipment gender preference
--
-- profiles.equipment_gender: whether the hunter wants to see male or
-- female equipment images. Chosen at email sign-up (passed via
-- auth user metadata) and editable in the profile.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS equipment_gender TEXT NOT NULL DEFAULT 'male';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_equipment_gender_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_equipment_gender_check
  CHECK (equipment_gender IN ('male', 'female'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url, equipment_gender)
  VALUES (
    NEW.id,
    -- Use email prefix as default username; can be changed later
    split_part(NEW.email, '@', 1),
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    CASE
      WHEN NEW.raw_user_meta_data ->> 'equipment_gender' IN ('male', 'female')
        THEN NEW.raw_user_meta_data ->> 'equipment_gender'
      ELSE 'male'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
