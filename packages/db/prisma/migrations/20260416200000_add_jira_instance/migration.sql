-- CreateTable
CREATE TABLE "jira_instances" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "atlassianUrl" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "apiToken" TEXT NOT NULL,
    "projectKeys" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jira_instances_pkey" PRIMARY KEY ("id")
);
