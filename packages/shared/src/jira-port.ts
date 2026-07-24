import { JiraEpic, JiraIssue } from "./jira-schemas";

export interface JiraPort {
  fetchEpics(projectKeys: string[]): Promise<JiraEpic[]>;
  fetchIssues(projectKeys: string[]): Promise<JiraIssue[]>;
  fetchProjectIssueTypes(projectKey: string): Promise<string[]>;
}
