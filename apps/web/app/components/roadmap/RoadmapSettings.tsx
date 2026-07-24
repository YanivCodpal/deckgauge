'use client';

import { useState } from 'react';
import { SIZE_LABELS } from '@deckgauge/shared';
import type { UpdateRoadmapConfigInput } from '@deckgauge/shared';

interface RoadmapSettingsConfig {
  startDate: string;
  visibleQuarters: number;
  sizeDurations: Record<string, number>;
  defaultSizeWeeks: number;
}

export interface RoadmapSettingsGroup {
  id: string;
  name: string;
  color: string;
}

interface RoadmapSettingsProps {
  config: RoadmapSettingsConfig;
  groups: RoadmapSettingsGroup[];
  hiddenGroupIds: string[];
  onChange: (patch: UpdateRoadmapConfigInput) => void;
}

export function RoadmapSettings({ config, groups, hiddenGroupIds, onChange }: RoadmapSettingsProps) {
  const [durations, setDurations] = useState<Record<string, number>>(config.sizeDurations);

  return (
    <div
      role="dialog"
      aria-label="Roadmap settings"
      style={{
        position: 'absolute',
        top: 40,
        right: 0,
        zIndex: 100,
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        minWidth: 260,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
          Start date
        </label>
        <input
          type="date"
          defaultValue={config.startDate.slice(0, 10)}
          onChange={(e) => {
            const iso = new Date(e.target.value).toISOString();
            onChange({ startDate: iso });
          }}
          style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px' }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
          Visible quarters
        </label>
        <input
          type="number"
          min={1}
          max={40}
          defaultValue={config.visibleQuarters}
          onChange={(e) => onChange({ visibleQuarters: Number(e.target.value) })}
          style={{ border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 6px', width: 64 }}
        />
      </div>

      <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 4, padding: '8px 12px' }}>
        <legend style={{ fontSize: 11, fontWeight: 600, color: '#64748b', padding: '0 4px' }}>
          Size durations (weeks)
        </legend>
        {SIZE_LABELS.map((label) => (
          <label
            key={label}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
          >
            <span style={{ minWidth: 32, fontSize: 12, fontWeight: 500 }}>{label}</span>
            <input
              type="number"
              step={0.5}
              min={0.5}
              value={durations[label] ?? config.defaultSizeWeeks}
              onChange={(e) => {
                const next = { ...durations, [label]: Number(e.target.value) };
                setDurations(next);
                onChange({ sizeDurations: next as UpdateRoadmapConfigInput['sizeDurations'] });
              }}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                padding: '2px 6px',
                width: 64,
              }}
            />
          </label>
        ))}
      </fieldset>

      <fieldset
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 4,
          padding: '8px 12px',
          marginTop: 12,
        }}
      >
        <legend style={{ fontSize: 11, fontWeight: 600, color: '#64748b', padding: '0 4px' }}>
          Groups
        </legend>
        {groups.map((g) => {
          const hidden = hiddenGroupIds.includes(g.id);
          return (
            <label
              key={g.id}
              style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
            >
              <input
                type="checkbox"
                checked={!hidden}
                aria-label={g.name}
                onChange={() => {
                  const next = hidden
                    ? hiddenGroupIds.filter((id) => id !== g.id)
                    : [...hiddenGroupIds, g.id];
                  onChange({ hiddenGroupIds: next });
                }}
              />
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: g.color,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 500 }}>{g.name}</span>
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}
