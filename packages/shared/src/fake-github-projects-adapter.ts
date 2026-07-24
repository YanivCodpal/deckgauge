import {
  GitHubProjectsPort,
  GitHubProjectItem,
} from './github-projects-port';
import { GitHubProject, GitHubProjectStatusOption } from './github-schemas';

export interface FakeProjectsSeed {
  projects: GitHubProject[];
  statusOptionsByNodeId: Record<string, GitHubProjectStatusOption[]>;
  itemsByNodeId: Record<string, GitHubProjectItem[]>;
}

const EMPTY_SEED: FakeProjectsSeed = {
  projects: [],
  statusOptionsByNodeId: {},
  itemsByNodeId: {},
};

export class FakeGitHubProjectsAdapter implements GitHubProjectsPort {
  constructor(private readonly seed: FakeProjectsSeed = EMPTY_SEED) {}

  async listAccessibleProjects(): Promise<GitHubProject[]> {
    return [...this.seed.projects];
  }

  async fetchProjectStatusOptions(projectNodeId: string): Promise<GitHubProjectStatusOption[]> {
    return this.seed.statusOptionsByNodeId[projectNodeId] ?? [];
  }

  async fetchProjectItems(projectNodeId: string): Promise<GitHubProjectItem[]> {
    return this.seed.itemsByNodeId[projectNodeId] ?? [];
  }
}
