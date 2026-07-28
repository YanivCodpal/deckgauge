import type { BoardScope } from '../intelligence/board-scope.js';

export interface UnionResult {
  /** Null when no scope leg applies. */
  sql: string | null;
  params: Record<string, unknown>;
}

// Canonical issue shape: id, created_at, closed_at, state, type, assignee,
// sprint_name, source.
//
// Per-provider divergences (see clickhouse/schemas/{01,09,30}_*.sql):
//   jira_issues:    status_category (not state), issue_type, assignee,
//                   resolved_at (not closed_at), sprint_name.
//   github_issues:  native state ('open'/'closed'), no type column (derive
//                   from labels: 'bug'/'defect' → 'Bug', else 'Other'),
//                   assignee_login, closed_at, no sprint.
//   ado_work_items: native state (workflow names — 'To Do', 'Active', 'Done', ...),
//                   work_item_type, assigned_to, closed_at, sprint_name.
const JIRA_ISSUES_COLUMNS = `
  toString(id)                                                                      AS id,
  created_at                                                                        AS created_at,
  resolved_at                                                                       AS closed_at,
  status_category                                                                   AS state,
  issue_type                                                                        AS type,
  assignee                                                                          AS assignee,
  sprint_name                                                                       AS sprint_name
`;

const GITHUB_ISSUES_COLUMNS = `
  toString(id)                                                                      AS id,
  created_at                                                                        AS created_at,
  closed_at                                                                         AS closed_at,
  state                                                                             AS state,
  if(hasAny(arrayMap(x -> lowerUTF8(x), labels), ['bug', 'defect']), 'Bug', 'Other') AS type,
  assignee_login                                                                    AS assignee,
  CAST(NULL AS Nullable(String))                                                    AS sprint_name
`;

const ADO_ISSUES_COLUMNS = `
  toString(id)                                                                      AS id,
  created_at                                                                        AS created_at,
  closed_at                                                                         AS closed_at,
  state                                                                             AS state,
  work_item_type                                                                    AS type,
  assigned_to                                                                       AS assignee,
  sprint_name                                                                       AS sprint_name
`;

// gitlab_issues: native state ('opened'/'closed' — normalise 'opened' → 'open'
// so it matches the github leg), no type column (derive from labels the same
// way as github: 'bug'/'defect' → 'Bug', else 'Other'), assignee_username, no
// sprint.
const GITLAB_ISSUES_COLUMNS = `
  toString(id)                                                                      AS id,
  created_at                                                                        AS created_at,
  closed_at                                                                         AS closed_at,
  if(state = 'opened', 'open', state)                                               AS state,
  if(hasAny(arrayMap(x -> lowerUTF8(x), labels), ['bug', 'defect']), 'Bug', 'Other') AS type,
  assignee_username                                                                 AS assignee,
  CAST(NULL AS Nullable(String))                                                    AS sprint_name
`;

export function issuesUnion(scope: BoardScope): UnionResult {
  const legs: string[] = [];
  const params: Record<string, unknown> = {};

  if (scope.jiraProjectKeys.length) {
    legs.push(`SELECT ${JIRA_ISSUES_COLUMNS}, 'jira' AS source
      FROM cockpit.jira_issues WHERE project_key IN {jiraProjects:Array(String)}`);
    params.jiraProjects = scope.jiraProjectKeys;
  }
  if (scope.githubRepoFullNames.length) {
    legs.push(`SELECT ${GITHUB_ISSUES_COLUMNS}, 'github' AS source
      FROM cockpit.github_issues WHERE repo_full_name IN {ghRepos:Array(String)}`);
    params.ghRepos = scope.githubRepoFullNames;
  }
  if (scope.gitlabProjectPaths.length) {
    legs.push(`SELECT ${GITLAB_ISSUES_COLUMNS}, 'gitlab' AS source
      FROM cockpit.gitlab_issues WHERE project_path IN {glIssuePaths:Array(String)}`);
    params.glIssuePaths = scope.gitlabProjectPaths;
  }
  if (scope.adoProjects.length) {
    legs.push(`SELECT ${ADO_ISSUES_COLUMNS}, 'ado' AS source
      FROM cockpit.ado_work_items WHERE project IN {adoProjects:Array(String)}`);
    params.adoProjects = scope.adoProjects;
  }
  return { sql: legs.length ? legs.join(' UNION ALL ') : null, params };
}

// Canonical PR shape every caller can rely on:
//   id, created_at, merged_at, closed_at, state, author, additions, deletions,
//   cycle_time_hours, first_review_at, is_ai_assisted, linked_ticket_keys, source.
//
// Each provider table has a different physical schema (see clickhouse/schemas/),
// so each leg aliases its native columns into this shape:
//   github_pull_requests:   author_login, state, ai_assisted, merged_at
//   gitlab_merge_requests:  author_username, state, ai_assisted, merged_at
//   ado_pull_requests:      created_by_login, status (not state), ai_assisted,
//                           first_vote_at (not first_review_at), no merged_at
//                           (synthesised from status='completed' + closed_at).
const GITHUB_PR_COLUMNS = `
  toString(id)                                AS id,
  created_at                                  AS created_at,
  merged_at                                   AS merged_at,
  closed_at                                   AS closed_at,
  state                                       AS state,
  author_login                                AS author,
  additions                                   AS additions,
  deletions                                   AS deletions,
  cycle_time_hours                            AS cycle_time_hours,
  first_review_at                             AS first_review_at,
  ai_assisted                                 AS is_ai_assisted,
  linked_ticket_keys                          AS linked_ticket_keys
`;

const GITLAB_MR_COLUMNS = `
  toString(id)                                AS id,
  created_at                                  AS created_at,
  merged_at                                   AS merged_at,
  closed_at                                   AS closed_at,
  state                                       AS state,
  author_username                             AS author,
  additions                                   AS additions,
  deletions                                   AS deletions,
  cycle_time_hours                            AS cycle_time_hours,
  first_review_at                             AS first_review_at,
  ai_assisted                                 AS is_ai_assisted,
  linked_ticket_keys                          AS linked_ticket_keys
`;

// ADO writes raw status ('completed' | 'active' | 'abandoned') and has no
// merged_at column. Map status → state ('completed' → 'merged', 'abandoned' →
// 'closed', else passthrough) and synthesise merged_at from closed_at when
// completed, so outer queries can filter (`merged_at IS NOT NULL` /
// `state = 'merged'`) uniformly across providers.
const ADO_PR_COLUMNS = `
  toString(id)                                                                   AS id,
  created_at                                                                     AS created_at,
  if(status = 'completed', closed_at, CAST(NULL AS Nullable(DateTime)))          AS merged_at,
  closed_at                                                                      AS closed_at,
  if(status = 'completed', 'merged', if(status = 'abandoned', 'closed', status)) AS state,
  created_by_login                                                               AS author,
  additions                                                                      AS additions,
  deletions                                                                      AS deletions,
  cycle_time_hours                                                               AS cycle_time_hours,
  first_vote_at                                                                  AS first_review_at,
  ai_assisted                                                                    AS is_ai_assisted,
  linked_ticket_keys                                                             AS linked_ticket_keys
`;

export function pullRequestsUnion(scope: BoardScope): UnionResult {
  const legs: string[] = [];
  const params: Record<string, unknown> = {};

  if (scope.githubRepoFullNames.length) {
    legs.push(`SELECT ${GITHUB_PR_COLUMNS}, 'github' AS source
      FROM cockpit.github_pull_requests WHERE repo_full_name IN {ghRepos:Array(String)}`);
    params.ghRepos = scope.githubRepoFullNames;
  }
  if (scope.gitlabProjectPaths.length) {
    legs.push(`SELECT ${GITLAB_MR_COLUMNS}, 'gitlab' AS source
      FROM cockpit.gitlab_merge_requests WHERE project_path IN {glPaths:Array(String)}`);
    params.glPaths = scope.gitlabProjectPaths;
  }
  if (scope.adoProjects.length) {
    legs.push(`SELECT ${ADO_PR_COLUMNS}, 'ado' AS source
      FROM cockpit.ado_pull_requests WHERE project IN {adoProjects:Array(String)}`);
    params.adoProjects = scope.adoProjects;
  }
  return { sql: legs.length ? legs.join(' UNION ALL ') : null, params };
}

// Canonical commit shape: sha, committed_at, author, message, additions,
// deletions, is_merge_commit, is_ai_assisted, source.
//
// Per-provider divergences (see clickhouse/schemas/{11,21,32}_*_commits.sql):
//   github_commits: author_login (Nullable) + author_email
//   gitlab_commits: NO author_login — only author_name + author_email
//   ado_commits:    author_login (Nullable) + author_email
// All three use ai_assisted (not is_ai_assisted).
//
// Author aliasing favours git email as a cross-provider identity fallback —
// every commit has a non-null email, whereas login is provider-specific and
// often null for bot / unauthored commits.
const GITHUB_COMMIT_COLUMNS = `
  sha                                         AS sha,
  committed_at                                AS committed_at,
  coalesce(author_login, author_email)        AS author,
  message                                     AS message,
  additions                                   AS additions,
  deletions                                   AS deletions,
  is_merge_commit                             AS is_merge_commit,
  ai_assisted                                 AS is_ai_assisted
`;

const GITLAB_COMMIT_COLUMNS = `
  sha                                         AS sha,
  committed_at                                AS committed_at,
  author_email                                AS author,
  message                                     AS message,
  additions                                   AS additions,
  deletions                                   AS deletions,
  is_merge_commit                             AS is_merge_commit,
  ai_assisted                                 AS is_ai_assisted
`;

const ADO_COMMIT_COLUMNS = `
  sha                                         AS sha,
  committed_at                                AS committed_at,
  coalesce(author_login, author_email)        AS author,
  message                                     AS message,
  additions                                   AS additions,
  deletions                                   AS deletions,
  is_merge_commit                             AS is_merge_commit,
  ai_assisted                                 AS is_ai_assisted
`;

export function commitsUnion(scope: BoardScope): UnionResult {
  const legs: string[] = [];
  const params: Record<string, unknown> = {};

  if (scope.githubRepoFullNames.length) {
    legs.push(`SELECT ${GITHUB_COMMIT_COLUMNS}, 'github' AS source
      FROM cockpit.github_commits WHERE repo_full_name IN {ghRepos:Array(String)}`);
    params.ghRepos = scope.githubRepoFullNames;
  }
  if (scope.gitlabProjectPaths.length) {
    legs.push(`SELECT ${GITLAB_COMMIT_COLUMNS}, 'gitlab' AS source
      FROM cockpit.gitlab_commits WHERE project_path IN {glPaths:Array(String)}`);
    params.glPaths = scope.gitlabProjectPaths;
  }
  if (scope.adoProjects.length) {
    legs.push(`SELECT ${ADO_COMMIT_COLUMNS}, 'ado' AS source
      FROM cockpit.ado_commits WHERE project IN {adoProjects:Array(String)}`);
    params.adoProjects = scope.adoProjects;
  }
  return { sql: legs.length ? legs.join(' UNION ALL ') : null, params };
}

// Canonical review shape: reviewer, provider, submitted_at, is_bot, is_approval.
// github_reviews/ado_reviews/gitlab_reviews are ReplacingMergeTree(synced_at) —
// FINAL drops re-sync duplicates. ADO has no review bots, so is_bot is constant
// 0 there; approval is `vote >= 5` (10 = approved, 5 = approved-with-suggestions).
// gitlab_reviews likewise has no bot signal modeled, so is_bot is constant 0;
// approval is `state = 'approved'` ('commented' is the other native state).
const GITHUB_REVIEW_COLUMNS = `
  reviewer_login                              AS reviewer,
  'github'                                    AS provider,
  submitted_at                                AS submitted_at,
  endsWith(reviewer_login, '[bot]')           AS is_bot,
  lower(state) = 'approved'                   AS is_approval
`;

const ADO_REVIEW_COLUMNS = `
  reviewer_login                              AS reviewer,
  'ado'                                       AS provider,
  submitted_at                                AS submitted_at,
  toUInt8(0)                                  AS is_bot,
  vote >= 5                                   AS is_approval
`;

const GITLAB_REVIEW_COLUMNS = `
  reviewer_username                           AS reviewer,
  'gitlab'                                    AS provider,
  submitted_at                                AS submitted_at,
  toUInt8(0)                                  AS is_bot,
  state = 'approved'                          AS is_approval
`;

export function reviewsUnion(scope: BoardScope): UnionResult {
  const legs: string[] = [];
  const params: Record<string, unknown> = {};

  if (scope.githubRepoFullNames.length) {
    legs.push(`SELECT ${GITHUB_REVIEW_COLUMNS}
      FROM cockpit.github_reviews FINAL WHERE repo_full_name IN {ghRepos:Array(String)}`);
    params.ghRepos = scope.githubRepoFullNames;
  }
  if (scope.adoProjects.length) {
    legs.push(`SELECT ${ADO_REVIEW_COLUMNS}
      FROM cockpit.ado_reviews FINAL WHERE project IN {adoProjects:Array(String)}`);
    params.adoProjects = scope.adoProjects;
  }
  if (scope.gitlabProjectPaths.length) {
    legs.push(`SELECT ${GITLAB_REVIEW_COLUMNS}
      FROM cockpit.gitlab_reviews FINAL WHERE project_path IN {glReviewPaths:Array(String)}`);
    params.glReviewPaths = scope.gitlabProjectPaths;
  }
  return { sql: legs.length ? legs.join(' UNION ALL ') : null, params };
}

// Per-developer commit shape. Surfaces both author_name and author_email
// (universal across all three commit tables) so the COMMITS_PER_DEV builder can
// key identity on the display name and fall back to email when the name is
// blank. Distinct from commitsUnion (whose shape rework-rate / bot-vs-human
// depend on) so those consumers stay untouched.
const DEV_COMMIT_COLUMNS = `
  author_email   AS author_email,
  author_name    AS author_name,
  committed_at   AS committed_at,
  additions      AS additions,
  deletions      AS deletions,
  ai_assisted    AS ai_assisted
`;

export function developerCommitsUnion(scope: BoardScope): UnionResult {
  const legs: string[] = [];
  const params: Record<string, unknown> = {};

  if (scope.githubRepoFullNames.length) {
    legs.push(`SELECT ${DEV_COMMIT_COLUMNS}
      FROM cockpit.github_commits
      WHERE repo_full_name IN {ghRepos:Array(String)} AND is_merge_commit = 0`);
    params.ghRepos = scope.githubRepoFullNames;
  }
  if (scope.gitlabProjectPaths.length) {
    legs.push(`SELECT ${DEV_COMMIT_COLUMNS}
      FROM cockpit.gitlab_commits
      WHERE project_path IN {glPaths:Array(String)} AND is_merge_commit = 0`);
    params.glPaths = scope.gitlabProjectPaths;
  }
  if (scope.adoProjects.length) {
    legs.push(`SELECT ${DEV_COMMIT_COLUMNS}
      FROM cockpit.ado_commits
      WHERE project IN {adoProjects:Array(String)} AND is_merge_commit = 0`);
    params.adoProjects = scope.adoProjects;
  }
  return { sql: legs.length ? legs.join(' UNION ALL ') : null, params };
}
