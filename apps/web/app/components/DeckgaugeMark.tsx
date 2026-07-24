interface DeckgaugeMarkProps {
  className?: string;
}

// Deckgauge dial mark, drawn bold so it stays legible at ~24px. A thick dial arc
// + needle use `currentColor` (teal on the white header tile, white on the teal
// rail tile); the needle-tip signal dot is a fixed amber for a focal pop that
// reads on either background — mirrors the marketing-site logo.
export function DeckgaugeMark({ className }: DeckgaugeMarkProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      {/* dial face */}
      <path d="M11 41 A 21 21 0 0 1 53 41" stroke="currentColor" strokeWidth={6} strokeLinecap="round" />
      {/* needle */}
      <line x1="32" y1="41" x2="23" y2="25.5" stroke="currentColor" strokeWidth={5.5} strokeLinecap="round" />
      {/* signal at the needle tip */}
      <circle cx="23" cy="25.5" r="4.5" fill="#f59e0b" />
      {/* hub */}
      <circle cx="32" cy="41" r="5.5" fill="currentColor" />
    </svg>
  );
}
