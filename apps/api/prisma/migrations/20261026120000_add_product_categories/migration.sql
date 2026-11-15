-- The frontend filters the product menu by categories. The original init migration
-- did not create this column even though Prisma schema and API code already used it.
-- IF NOT EXISTS also supports local databases where the column was added manually
-- with `prisma db push` before this migration was committed.
ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "categories" VARCHAR(50) DEFAULT 'Tea';

ALTER TABLE "products"
ALTER COLUMN "categories" SET DEFAULT 'Tea';

UPDATE "products" SET "categories" = 'Tea' WHERE "categories" IS NULL;
