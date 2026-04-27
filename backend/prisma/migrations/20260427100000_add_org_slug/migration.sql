-- Add slug to organizations for org-aware auth and routing
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- Backfill existing rows with deterministic slugs
UPDATE "Organization"
SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'))
WHERE "slug" IS NULL OR "slug" = '';

-- Make slug required and unique
ALTER TABLE "Organization" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");
