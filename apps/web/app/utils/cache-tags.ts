/**
 * Centralized cache-tag builders for Next.js `revalidateTag` and the `next.tags`
 * fetch option. Keep tag strings flat (no nesting) — Next.js does not do prefix
 * matching.
 */

export function boardsListTag(): string {
  return "boards:list";
}

export function boardTag(boardId: string): string {
  return `board:${boardId}`;
}

export function commentsTag(projectId: string): string {
  return `comments:${projectId}`;
}

export function widgetsTag(boardId: string, viewId: string): string {
  return `widgets:${boardId}:${viewId}`;
}

export function boardTreeTag(userId: string): string {
  return `board-tree:${userId}`;
}
