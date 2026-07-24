'use client';

import { useCallback, useState } from 'react';
import { fetchSourceStatuses } from '../../../actions/board-sources';
import { StatusMappingEditor, type BoardStatusOption } from '../StatusMappingEditor';

interface Props {
  mapping: Record<string, string>;
  // Editor-related — all required so the modal can fetch + save. The button
  // is disabled (with a tooltip) if the board has no statuses configured yet.
  boardId: string;
  sourceId: string;
  provider: 'jira' | 'github' | 'ado';
  boardStatuses: BoardStatusOption[];
  // Updates the parent card's local draft so the count chip reflects the
  // new mapping immediately. Called only after `onSave` resolves.
  onChange: (mapping: Record<string, string>) => void;
  // Persists the mapping to the server. Throws on failure so the editor can
  // keep itself open and surface the error to the user. Owned by the parent
  // (BoardSourcesList) so the in-memory sources state can be re-hydrated
  // alongside the patch — otherwise the count would silently revert if the
  // user collapsed and re-expanded the card.
  onSave: (mapping: Record<string, string>) => Promise<void>;
}

const PROVIDER_LABEL: Record<Props['provider'], string> = {
  jira: 'Jira',
  github: 'GitHub',
  ado: 'Azure DevOps',
};

export function StatusMappingLink({
  mapping,
  boardId,
  sourceId,
  provider,
  boardStatuses,
  onChange,
  onSave,
}: Props) {
  const [open, setOpen] = useState(false);
  const count = Object.keys(mapping).length;
  const canEdit = boardStatuses.length > 0;

  const fetcher = useCallback(
    () => fetchSourceStatuses(boardId, provider, sourceId),
    [boardId, provider, sourceId],
  );

  const handleEditorSave = useCallback(
    async (next: Record<string, string>) => {
      await onSave(next);
      onChange(next);
    },
    [onSave, onChange],
  );

  return (
    <span className="inline-flex items-center gap-2">
      <span className="px-2 py-0.5 rounded-md text-xs bg-slate-100 text-slate-600">
        {count} {count === 1 ? 'status mapped' : 'statuses mapped'}
      </span>
      <button
        type="button"
        disabled={!canEdit}
        title={canEdit ? undefined : 'Board has no statuses configured yet'}
        className="text-xs text-indigo-600 hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
        onClick={() => setOpen(true)}
      >
        edit mapping →
      </button>
      <StatusMappingEditor
        open={open}
        providerLabel={PROVIDER_LABEL[provider]}
        fetchSourceStatuses={fetcher}
        boardStatuses={boardStatuses}
        initialMapping={mapping}
        onSave={handleEditorSave}
        onClose={() => setOpen(false)}
      />
    </span>
  );
}
