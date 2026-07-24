'use client';

import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import type { Project } from '@deckgauge/shared';
import { ProjectRow, type ProjectRowProps } from './ProjectRow';

// Fixed row height in px. Matches the rendered BoardRow height; tune if the row
// design changes. Rows use `truncate`, so a fixed height is safe.
export const ROW_HEIGHT = 44;
// Cap the in-group scroll viewport so a 20K group scrolls inside its own window
// instead of emitting 20K DOM nodes.
export const MAX_VIEWPORT_PX = 640;

type ProjectWithFields = Project & { fieldValues?: Record<string, string> };

interface VirtualProjectRowsProps {
  projects: ProjectWithFields[];
  buildRowProps: (project: ProjectWithFields) => ProjectRowProps;
}

interface RowData {
  projects: ProjectWithFields[];
  buildRowProps: (project: ProjectWithFields) => ProjectRowProps;
}

function Row({ index, style, data }: ListChildComponentProps<RowData>) {
  const project = data.projects[index];
  return (
    <div style={style}>
      <ProjectRow {...data.buildRowProps(project)} />
    </div>
  );
}

export function VirtualProjectRows({ projects, buildRowProps }: VirtualProjectRowsProps) {
  const height = Math.min(projects.length * ROW_HEIGHT, MAX_VIEWPORT_PX);
  return (
    <FixedSizeList
      height={height}
      width="100%"
      itemCount={projects.length}
      itemSize={ROW_HEIGHT}
      itemKey={(index) => projects[index].id}
      itemData={{ projects, buildRowProps }}
      overscanCount={6}
    >
      {Row}
    </FixedSizeList>
  );
}
