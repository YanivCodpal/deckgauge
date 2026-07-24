-- CreateEnum
CREATE TYPE "sync_run_status" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "sync_run_trigger" AS ENUM ('startup', 'manual', 'scheduled');

-- CreateTable
CREATE TABLE "jira_projects" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "jira_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_epics" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignee" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_epics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jira_issues" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "epicKey" TEXT,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignee" TEXT,
    "type" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jira_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "status" "sync_run_status" NOT NULL,
    "trigger" "sync_run_trigger" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "epicCount" INTEGER NOT NULL DEFAULT 0,
    "issueCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jira_projects_key_key" ON "jira_projects"("key");

-- CreateIndex
CREATE UNIQUE INDEX "jira_epics_key_projectKey_key" ON "jira_epics"("key", "projectKey");

-- CreateIndex
CREATE UNIQUE INDEX "jira_issues_key_projectKey_key" ON "jira_issues"("key", "projectKey");
