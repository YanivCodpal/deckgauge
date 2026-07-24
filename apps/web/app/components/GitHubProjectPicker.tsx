'use client';
import { useId } from 'react';

export type GitHubProjectSelection = {
  nodeId: string;
  owner: string;
  number: number;
  title: string;
  ownerType: 'org' | 'user';
};

interface Props {
  projects: GitHubProjectSelection[];
  value: GitHubProjectSelection | null;
  onChange: (selection: GitHubProjectSelection | null) => void;
}

export function GitHubProjectPicker({ projects, value, onChange }: Props) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>GitHub Project</label>
      <select
        id={id}
        aria-label="GitHub Project"
        value={value?.nodeId ?? ''}
        onChange={(e) => {
          const nodeId = e.target.value;
          if (!nodeId) {
            onChange(null);
            return;
          }
          const found = projects.find((p) => p.nodeId === nodeId);
          if (found) onChange(found);
        }}
      >
        <option value="">(none — use issue state)</option>
        {projects.map((p) => (
          <option key={p.nodeId} value={p.nodeId}>
            {p.owner}/{p.title} (#{p.number})
          </option>
        ))}
      </select>
    </div>
  );
}
