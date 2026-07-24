export type Provider = 'jira' | 'ado' | 'github';

export interface RawTransition {
  issueKey: string;
  provider: Provider;
  assignee: string | null;
  status: string;
  category: string | null; // jira to_category; null for ado/github
  transitionedAtMs: number;
}

export interface StatusSpan {
  issueKey: string;
  provider: Provider;
  assignee: string | null;
  status: string;
  category: string | null;
  startMs: number;
  endMs: number;
}
