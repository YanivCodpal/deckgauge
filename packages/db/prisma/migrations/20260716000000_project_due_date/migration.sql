-- Always-present "Due date" system field for board projects (initiatives).
-- Manually editable on the board; feeds the Initiative Risk Radar widget,
-- taking precedence over the synced Jira/GitHub source deadline.
ALTER TABLE "projects" ADD COLUMN "due_date" TIMESTAMP(3);
