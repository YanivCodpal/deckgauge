'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ShellRowWrapperProps } from '@deckgauge/ui';

/**
 * Factory for the org board's draggable row wrapper, used as BoardShell's
 * `RowComponent`. Uses @dnd-kit's `useSortable` (not plain `useDraggable`) so
 * rows animate as siblings shift and can be reordered to a precise position —
 * matching the main project board's drag experience. `dragDisabled` (drag is off
 * while a sort is active) is baked in; memoize per `dragDisabled` at the call
 * site to keep a stable identity.
 *
 * The stable logical `rowKey` (the member id) drives the `mem-<id>` sortable id
 * and the data attributes the bulk-edit tests query.
 */
export function makeEmployeeShellRow(dragDisabled: boolean) {
  return function EmployeeShellRow<Row>({
    rowKey,
    className,
    style,
    children,
  }: ShellRowWrapperProps<Row>) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: `mem-${rowKey}`,
      disabled: dragDisabled,
    });
    const mergedStyle = {
      ...style,
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : undefined,
    };
    return (
      <div
        ref={setNodeRef}
        data-employee-row-id={rowKey}
        data-row-id={rowKey}
        className={className}
        style={mergedStyle}
        {...attributes}
        {...listeners}
      >
        {children}
      </div>
    );
  };
}
