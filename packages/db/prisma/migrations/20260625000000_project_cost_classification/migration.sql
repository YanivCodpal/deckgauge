-- CreateEnum
CREATE TYPE "cost_classification" AS ENUM ('CAPEX', 'OPEX');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN "cost_classification" "cost_classification";
