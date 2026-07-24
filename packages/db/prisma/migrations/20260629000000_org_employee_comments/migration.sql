CREATE TABLE "org_employee_comments" (
  "id" TEXT NOT NULL,
  "org_employee_id" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "author_name" TEXT NOT NULL DEFAULT 'VP',
  "author_avatar" TEXT,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "author_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "org_employee_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "org_employee_comments_org_employee_id_pinned_created_at_idx"
  ON "org_employee_comments" ("org_employee_id", "pinned", "created_at");
CREATE INDEX "org_employee_comments_author_id_idx"
  ON "org_employee_comments" ("author_id");

ALTER TABLE "org_employee_comments"
  ADD CONSTRAINT "org_employee_comments_org_employee_id_fkey"
  FOREIGN KEY ("org_employee_id") REFERENCES "org_employees" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_employee_comments"
  ADD CONSTRAINT "org_employee_comments_author_id_fkey"
  FOREIGN KEY ("author_id") REFERENCES "users" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Uploads: allow employee-scoped uploads (projectId becomes nullable)
ALTER TABLE "uploads" ALTER COLUMN "project_id" DROP NOT NULL;
ALTER TABLE "uploads" ADD COLUMN "org_employee_id" TEXT;
ALTER TABLE "uploads" ADD COLUMN "employee_comment_id" TEXT;

CREATE INDEX "uploads_org_employee_id_idx" ON "uploads" ("org_employee_id");
CREATE INDEX "uploads_employee_comment_id_idx" ON "uploads" ("employee_comment_id");

ALTER TABLE "uploads"
  ADD CONSTRAINT "uploads_org_employee_id_fkey"
  FOREIGN KEY ("org_employee_id") REFERENCES "org_employees" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "uploads"
  ADD CONSTRAINT "uploads_employee_comment_id_fkey"
  FOREIGN KEY ("employee_comment_id") REFERENCES "org_employee_comments" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
