'use client';

interface DragDateOverlayProps {
  /** timeline px from start of timeline area; null hides the overlay */
  x: number | null;
  date: Date | null;
  laneLabelWidth: number;
  height: number;
}

const fmt = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function DragDateOverlay({ x, date, laneLabelWidth, height }: DragDateOverlayProps) {
  if (x == null || !date) return null;
  const left = laneLabelWidth + x;
  return (
    <div aria-hidden style={{ position: 'absolute', top: 0, left, height, zIndex: 30, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, width: 1, background: '#2563eb' }} />
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 6,
          background: '#1e293b',
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: 6,
          whiteSpace: 'nowrap',
        }}
      >
        {fmt(date)}
      </div>
    </div>
  );
}
