/**
 * One Azure DevOps work-item revision, projected to the fields the timesheet
 * transition builder needs. `changedAt` is the revision's System.ChangedDate.
 */
export interface AdoWorkItemRevision {
  workItemId: number;
  project: string;
  workItemType: string;
  state: string;
  assignedTo: string | null;
  changedBy: string | null;
  changedAt: Date;
}
