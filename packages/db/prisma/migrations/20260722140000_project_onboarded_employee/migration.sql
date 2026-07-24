-- Recruitment onboarding: link a candidate row to the OrgEmployee it was onboarded as.
-- Nullable; set once a Hired candidate is onboarded into an org tree. Guards double-onboard.
ALTER TABLE "projects" ADD COLUMN "onboarded_employee_id" TEXT;
