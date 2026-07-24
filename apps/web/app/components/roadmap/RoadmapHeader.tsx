'use client';
import { LANE_LABEL_WIDTH, HEADER_HEIGHT, type Quarter } from './geometry';

interface RoadmapHeaderProps {
  quarters: Quarter[];
  timelineWidth: number;
  visibleQuarters: number;
  onChangeVisibleQuarters: (n: number) => void;
}

export function RoadmapHeader({
  quarters,
  timelineWidth,
  visibleQuarters,
  onChangeVisibleQuarters,
}: RoadmapHeaderProps) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 4,
        height: HEADER_HEIGHT,
        width: LANE_LABEL_WIDTH + timelineWidth,
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
      {/* Sticky gutter: timeline label + zoom control */}
      <div
        style={{
          position: 'sticky',
          left: 0,
          zIndex: 5,
          width: LANE_LABEL_WIDTH,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '0 12px',
          background: '#ffffff',
          borderRight: '1px solid #e2e8f0',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', letterSpacing: 0.3 }}>
          TIMELINE
        </span>
        <select
          aria-label="Visible quarters"
          value={visibleQuarters}
          onChange={(e) => onChangeVisibleQuarters(Number(e.target.value))}
          style={{
            fontSize: 12,
            padding: '2px 6px',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            background: '#f8fafc',
            color: '#334155',
          }}
        >
          <option value={4}>1 year</option>
          <option value={8}>2 years</option>
        </select>
      </div>

      {/* Quarter columns */}
      {quarters.map((q, i) => (
        <div
          key={q.label}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: LANE_LABEL_WIDTH + q.x,
            width: q.widthPx,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            fontSize: 13,
            fontWeight: 700,
            color: '#334155',
            borderLeft: i === 0 ? undefined : '1px solid #eef2f7',
          }}
        >
          {q.label}
        </div>
      ))}
    </div>
  );
}
