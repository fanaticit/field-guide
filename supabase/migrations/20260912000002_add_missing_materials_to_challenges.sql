-- Add missing materials tracking to hunter_challenges
ALTER TABLE "public"."hunter_challenges" 
ADD COLUMN IF NOT EXISTS "missing_material" text,
ADD COLUMN IF NOT EXISTS "missing_material_activity" text;

-- Add comment to columns
COMMENT ON COLUMN "public"."hunter_challenges"."missing_material" IS 'User-provided text describing what material is currently missing for crafting/upgrading.';
COMMENT ON COLUMN "public"."hunter_challenges"."missing_material_activity" IS 'Optional user-provided text describing the activity or hunt to acquire the missing material.';
