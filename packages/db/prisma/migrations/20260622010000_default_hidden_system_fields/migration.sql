ALTER TABLE "boards" ALTER COLUMN "hidden_system_fields" SET DEFAULT ARRAY['startDate','endDate','duration']::text[];
UPDATE "boards" SET "hidden_system_fields" = ARRAY['startDate','endDate','duration']::text[] WHERE "hidden_system_fields" = '{}';
