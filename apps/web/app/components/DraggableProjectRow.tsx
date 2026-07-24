'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProjectRow, type ProjectRowProps } from './ProjectRow';

interface DraggableProjectRowProps extends ProjectRowProps {
  id: string;
  disabled?: boolean;
}

export function DraggableProjectRow({ id, disabled, ...rowProps }: DraggableProjectRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
      suppressHydrationWarning
    >
      <ProjectRow {...rowProps} />
    </div>
  );
}
