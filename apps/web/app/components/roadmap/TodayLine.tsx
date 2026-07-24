'use client';
import { LANE_LABEL_WIDTH, dateToX } from './geometry';

export function TodayLine({ viewStart }: { viewStart: Date }) {
  const now = new Date();
  const offset = dateToX(now, viewStart);
  if (offset < 0) return null;
  const left = LANE_LABEL_WIDTH + offset;
  return (
    <div
      data-testid="today-line"
      aria-label={`Today, ${now.toDateString()}`}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${left}px`,
        width: 2,
        background: '#ef4444',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: -4,
          transform: 'translateX(-50%)',
          background: '#ef4444',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          lineHeight: 1,
          padding: '3px 6px',
          borderRadius: 9999,
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      >
        Today
      </span>
    </div>
  );
}
