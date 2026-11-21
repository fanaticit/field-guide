-- ============================================================
-- Migration: 20261121000002 — Update Fated Adventurer default images
-- ============================================================

UPDATE public.adventurers
SET 
  image = '/images/adventurers/RoleHeadIcon_MCO.png',
  background_image = '/images/adventurers/RoleBust_MCO.png'
WHERE is_default = TRUE OR id = 'default_adventurer';
