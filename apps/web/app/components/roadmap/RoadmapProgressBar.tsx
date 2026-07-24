'use client';
export function RoadmapProgressBar({ progress, count }: { progress: number; count: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ padding: 16 }}
    >
      <div>Scheduling {count.toLocaleString()} tasks…</div>
      <div style={{ height: 6, background: '#eee', borderRadius: 3, marginTop: 8 }}>
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: '#579BFC',
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
}
