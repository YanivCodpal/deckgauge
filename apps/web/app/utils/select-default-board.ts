/**
 * Pure helper for choosing which board to render on `/` when no
 * explicit `?boardId` is in the URL.
 *
 * Rules:
 *  1. Empty boards list → null.
 *  2. Cookie value is a board ID present in the list → return it.
 *  3. Otherwise → first board in the list.
 */
export function selectDefaultBoard(
  boards: Array<{ id: string }>,
  lastBoardCookieValue: string | undefined,
): string | null {
  if (boards.length === 0) return null;
  if (
    lastBoardCookieValue &&
    boards.some((b) => b.id === lastBoardCookieValue)
  ) {
    return lastBoardCookieValue;
  }
  return boards[0].id;
}
