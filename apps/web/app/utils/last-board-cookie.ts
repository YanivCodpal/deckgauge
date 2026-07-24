export const LAST_BOARD_COOKIE = 'vpc_last_board';

// 1 year in seconds — matches the spec's lifetime for "last viewed board"
export const LAST_BOARD_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Client-side cookie write. Used from "use client" components.
 * The cookie carries no auth, so a non-HttpOnly client write is fine.
 */
export function setLastBoardCookie(boardId: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LAST_BOARD_COOKIE}=${encodeURIComponent(boardId)}; Path=/; Max-Age=${LAST_BOARD_COOKIE_MAX_AGE}; SameSite=Lax`;
}
