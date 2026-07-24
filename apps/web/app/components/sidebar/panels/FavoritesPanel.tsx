'use client';

import type { BoardNodeData, RoadmapNodeData } from '@deckgauge/shared';
import { BoardNode } from '../BoardNode';
import { RoadmapNode } from '../RoadmapNode';
import { PanelEmptyState } from './PanelEmptyState';
import { isBoardNode } from '../tree-filter';

interface FavoritesPanelProps {
  favorites: (BoardNodeData | RoadmapNodeData)[];
  activeId: string | null;
  openBoard: (id: string) => void;
  onToggleBoardFavorite: (board: BoardNodeData) => void;
  onHideBoard: (board: BoardNodeData) => void;
  onUnhideBoard: (board: BoardNodeData) => void;
  onToggleRoadmapFavorite: (node: RoadmapNodeData) => void;
  onHideRoadmap: (node: RoadmapNodeData) => void;
  onUnhideRoadmap: (node: RoadmapNodeData) => void;
  onDeleteRoadmap: (node: RoadmapNodeData) => void;
}

export function FavoritesPanel({
  favorites,
  activeId,
  openBoard,
  onToggleBoardFavorite,
  onHideBoard,
  onUnhideBoard,
  onToggleRoadmapFavorite,
  onHideRoadmap,
  onUnhideRoadmap,
  onDeleteRoadmap,
}: FavoritesPanelProps) {
  if (favorites.length === 0) {
    return (
      <PanelEmptyState message="No favorites yet. Star a board or roadmap to pin it here." />
    );
  }

  return (
    <>
      {favorites.map((node) =>
        isBoardNode(node) ? (
          <BoardNode
            key={node.id}
            board={node}
            depth={0}
            active={node.id === activeId}
            onOpen={openBoard}
            onToggleFavorite={onToggleBoardFavorite}
            onHide={onHideBoard}
            onUnhide={onUnhideBoard}
          />
        ) : (
          <RoadmapNode
            key={node.id}
            node={node}
            depth={0}
            active={node.id === activeId}
            onToggleFavorite={onToggleRoadmapFavorite}
            onHide={onHideRoadmap}
            onUnhide={onUnhideRoadmap}
            onDelete={onDeleteRoadmap}
          />
        ),
      )}
    </>
  );
}
