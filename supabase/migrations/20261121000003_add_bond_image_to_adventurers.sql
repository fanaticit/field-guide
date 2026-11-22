-- ============================================================
-- Migration: 20261121000003 — Add bond_image to adventurers
-- ============================================================

ALTER TABLE public.adventurers
  ADD COLUMN IF NOT EXISTS bond_image TEXT;

UPDATE public.adventurers SET bond_image = '/images/adventurers/RoleBond_MCO.png' WHERE is_default = TRUE OR id = 'default_adventurer';
UPDATE public.adventurers SET bond_image = '/images/adventurers/101001_bond.png' WHERE id = '101001';
UPDATE public.adventurers SET bond_image = '/images/adventurers/101002_bond.png' WHERE id = '101002';
UPDATE public.adventurers SET bond_image = '/images/adventurers/101003_bond.png' WHERE id = '101003';
UPDATE public.adventurers SET bond_image = '/images/adventurers/102002_bond.png' WHERE id = '102002';
UPDATE public.adventurers SET bond_image = '/images/adventurers/102004_bond.png' WHERE id = '102004';
UPDATE public.adventurers SET bond_image = '/images/adventurers/104001_bond.png' WHERE id = '104001';
UPDATE public.adventurers SET bond_image = '/images/adventurers/104002_bond.png' WHERE id = '104002';
UPDATE public.adventurers SET bond_image = '/images/adventurers/104004_bond.png' WHERE id = '104004';
UPDATE public.adventurers SET bond_image = '/images/adventurers/105001_bond.png' WHERE id = '105001';
UPDATE public.adventurers SET bond_image = '/images/adventurers/107001_bond.png' WHERE id = '107001';
UPDATE public.adventurers SET bond_image = '/images/adventurers/107002_bond.png' WHERE id = '107002';
UPDATE public.adventurers SET bond_image = '/images/adventurers/113001_bond.png' WHERE id = '113001';
UPDATE public.adventurers SET bond_image = '/images/adventurers/114002_bond.png' WHERE id = '114002';
UPDATE public.adventurers SET bond_image = '/images/adventurers/114003_bond.png' WHERE id = '114003';
UPDATE public.adventurers SET bond_image = '/images/adventurers/114004_bond.png' WHERE id = '114004';
