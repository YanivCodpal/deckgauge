-- AlterTable: mark org employees imported from vacancy/requisition rows as
-- placeholder nodes so their real reports stay attached to the hierarchy.
ALTER TABLE "org_employees" ADD COLUMN "is_vacancy" BOOLEAN NOT NULL DEFAULT false;
