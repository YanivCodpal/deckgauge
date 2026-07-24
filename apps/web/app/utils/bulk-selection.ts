import { isTempId } from './optimistic-mutators';

/**
 * Resolve which project ids an inline field edit should apply to.
 *
 * When the edited row is part of a multi-row selection, the edit fans out to
 * the whole selection (monday.com-style bulk edit). Otherwise it stays a
 * single-row edit. Temp/unsaved ids are dropped so the server loop never
 * PATCHes a row that does not exist yet.
 */
export function resolveBulkTargets(editedId: string, selectedIds: Set<string>): string[] {
  const ids =
    selectedIds.has(editedId) && selectedIds.size > 1 ? Array.from(selectedIds) : [editedId];
  return ids.filter((id) => !isTempId(id));
}
