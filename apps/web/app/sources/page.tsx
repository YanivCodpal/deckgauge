import { IntelligenceSyncTrigger } from '../components/IntelligenceSyncTrigger';
import { JiraConnectionsPanel } from '../components/connections/JiraConnectionsPanel';
import { GitHubConnectionsPanel } from '../components/connections/GitHubConnectionsPanel';
import { AzureDevOpsConnectionsPanel } from '../components/connections/AzureDevOpsConnectionsPanel';
import { GitLabConnectionsPanel } from '../components/connections/GitLabConnectionsPanel';
import { InstancesPanel } from '../components/connections/InstancesPanel';
import {
  listJiraProjectSyncs,
  listGitHubRepoSyncs,
  listAdoProjectSyncs,
  listGitLabProjectSyncs,
  listJiraInstances,
  listGitHubInstances,
  listAdoInstances,
  listGitLabInstances,
  refreshJiraToken,
  refreshGitHubToken,
  refreshAdoToken,
  refreshGitLabToken,
  testJiraConnection,
  testGitHubConnection,
  testAdoConnection,
  testGitLabConnection,
} from '../actions/connections';

export const dynamic = 'force-dynamic';

export default async function SourcesPage() {
  const [
    jiraSyncs,
    githubSyncs,
    adoSyncs,
    gitlabSyncs,
    jiraInstances,
    githubInstances,
    adoInstances,
    gitlabInstances,
  ] = await Promise.all([
    listJiraProjectSyncs().catch(() => []),
    listGitHubRepoSyncs().catch(() => []),
    listAdoProjectSyncs().catch(() => []),
    listGitLabProjectSyncs().catch(() => []),
    listJiraInstances().catch(() => []),
    listGitHubInstances().catch(() => []),
    listAdoInstances().catch(() => []),
    listGitLabInstances().catch(() => []),
  ]);

  return (
    <main className="space-y-6 px-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Sources</h1>
        <p className="mt-1 text-sm text-slate-600">
          Catalog of providers and project syncs, shared by all boards.
        </p>
      </header>
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <IntelligenceSyncTrigger />
      </section>

      <InstancesPanel
        provider="jira"
        title="Jira"
        instances={jiraInstances}
        onTest={testJiraConnection}
        onRefresh={refreshJiraToken}
      />
      <InstancesPanel
        provider="github"
        title="GitHub"
        instances={githubInstances}
        onTest={testGitHubConnection}
        onRefresh={refreshGitHubToken}
      />
      <InstancesPanel
        provider="ado"
        title="Azure DevOps"
        instances={adoInstances}
        onTest={testAdoConnection}
        onRefresh={refreshAdoToken}
      />
      <InstancesPanel
        provider="gitlab"
        title="GitLab"
        instances={gitlabInstances}
        onTest={testGitLabConnection}
        onRefresh={refreshGitLabToken}
      />

      <JiraConnectionsPanel initialSyncs={jiraSyncs} />
      <GitHubConnectionsPanel initialSyncs={githubSyncs} />
      <AzureDevOpsConnectionsPanel initialSyncs={adoSyncs} />
      <GitLabConnectionsPanel initialSyncs={gitlabSyncs} />
    </main>
  );
}
