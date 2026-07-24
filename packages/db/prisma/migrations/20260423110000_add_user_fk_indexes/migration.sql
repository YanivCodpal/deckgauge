-- Add missing userId/authorId FK indexes for IAM access queries

-- BoardAccess: index on user_id for "what boards can this user access?" queries
CREATE INDEX "board_access_user_id_idx" ON "board_access"("user_id");

-- BoardOwner: index on user_id for owner lookup by user
CREATE INDEX "board_owners_user_id_idx" ON "board_owners"("user_id");

-- ProjectComment: index on author_id for comment lookup by user
CREATE INDEX "project_comments_author_id_idx" ON "project_comments"("author_id");
