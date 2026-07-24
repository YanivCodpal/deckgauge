-- Pasted Microsoft Graph access token for the no-registration "paste a token" connect.
-- Additive + nullable; existing rows read as "not connected".
ALTER TABLE "org_tree_sources" ADD COLUMN "ms_access_token" TEXT;
