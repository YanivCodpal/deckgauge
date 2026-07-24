'use client';

import type { ComponentProps } from 'react';
import type { BoardNodeData, SidebarNode } from '@deckgauge/shared';
import { SidebarTree } from '../SidebarTree';
import { BoardNode } from '../BoardNode';
import type { SidebarSection } from '../../../hooks/useSidebarUiState';

type TreeHandlers = ComponentProps<typeof SidebarTree>['handlers'];

interface BoardsPanelProps {
  favorites: BoardNodeData[];
  tree: SidebarNode[];
  hidden: BoardNodeData[];
  activeBoardId: string | null;
  openBoard: (id: string) => void;
  handlers: TreeHandlers;
  isSectionOpen: (section: SidebarSection) => boolean;
  toggleSection: (section: SidebarSection) => void;
}

export function BoardsPanel({
  favorites,
  tree,
  hidden,
  activeBoardId,
  openBoard,
  handlers,
  isSectionOpen,
  toggleSection,
}: BoardsPanelProps) {
  return (
    <>
      {favorites.length > 0 && (
        <>
          <SectionHeader
            label="★ Favorites"
            open={isSectionOpen('favorites')}
            onToggle={() => toggleSection('favorites')}
          />
          {isSectionOpen('favorites') &&
            favorites.map((b) => (
              <BoardNode
                key={b.id}
                board={b}
                depth={0}
                active={b.id === activeBoardId}
                onOpen={openBoard}
                onToggleFavorite={handlers.onToggleFavorite}
                onHide={handlers.onHideBoard}
                onUnhide={handlers.onUnhideBoard}
              />
            ))}
        </>
      )}

      <SidebarTree nodes={tree} handlers={handlers} />

      <SectionHeader
        label={`Hidden (${hidden.length})`}
        open={isSectionOpen('hidden')}
        onToggle={() => toggleSection('hidden')}
        muted
      />
      {isSectionOpen('hidden') &&
        hidden.map((b) => (
          <BoardNode
            key={b.id}
            board={b}
            depth={0}
            hidden
            active={b.id === activeBoardId}
            onOpen={openBoard}
            onToggleFavorite={handlers.onToggleFavorite}
            onHide={handlers.onHideBoard}
            onUnhide={handlers.onUnhideBoard}
          />
        ))}
    </>
  );
}

interface SectionHeaderProps {
  label: string;
  open: boolean;
  onToggle: () => void;
  muted?: boolean;
}

function SectionHeader({ label, open, onToggle, muted = false }: SectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`mt-2 flex w-full items-center gap-1 px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${
        muted ? 'text-slate-400' : 'text-slate-500'
      }`}
    >
      <span className={`transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true">
        ▸
      </span>
      {label}
    </button>
  );
}
