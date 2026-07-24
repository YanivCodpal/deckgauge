/**
 * Board capabilities — the domain behaviours a board opts into, gated by its `kind`.
 *
 * This is the only board-type-specific behaviour seam. A `standard` board has no
 * capabilities; a `recruitment` board opts into calendar ingest and org-tree
 * onboarding. Phase 1 only exposes the flags (no behaviour is wired yet) so the
 * gating seam exists before the capabilities are built (Phases 2–3). We generalize
 * this mechanism only when a third board needs a third behaviour — not before.
 * See planning/RECRUITMENT-PHASE-1.md.
 */

export interface BoardCapabilities {
  /** Interviews can be ingested from a connected calendar into candidate rows. */
  calendarSource: boolean;
  /** A card can be onboarded into an org tree as an employee. */
  onboardTarget: boolean;
}

const NONE: BoardCapabilities = { calendarSource: false, onboardTarget: false };

/**
 * The capabilities a board of the given kind has. Accepts a raw string (the
 * `Board.kind` column is a string) and returns no capabilities for unknown kinds.
 */
export function boardCapabilities(kind: string): BoardCapabilities {
  switch (kind) {
    case 'recruitment':
      return { calendarSource: true, onboardTarget: true };
    default:
      return NONE;
  }
}
