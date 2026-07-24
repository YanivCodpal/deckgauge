/*
  Warnings:

  - Changed the type of `status` on the `projects` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('Not started', 'In progress', 'At risk', 'Blocked', 'Done');

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "status",
ADD COLUMN     "status" "project_status" NOT NULL;
