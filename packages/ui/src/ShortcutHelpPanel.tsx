'use client';

import { SlideOverPanel } from './SlideOverPanel';

interface ShortcutHelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  key: string;
  description: string;
}

const NAVIGATION_SHORTCUTS: ShortcutEntry[] = [
  { key: 'Tab', description: 'Next row' },
  { key: 'Shift+Tab', description: 'Previous row' },
  { key: '↑ / ↓', description: 'Move between rows' },
  { key: 'Enter', description: 'Enter cell mode / edit cell' },
  { key: '← / →', description: 'Move between cells' },
  { key: 'Escape', description: 'Exit current mode' },
  { key: 'G then ↑', description: 'Jump to previous group' },
  { key: 'G then ↓', description: 'Jump to next group' },
];

const ACTION_SHORTCUTS: ShortcutEntry[] = [
  { key: 'Space', description: 'Toggle row selection' },
  { key: 'Delete', description: 'Delete focused row' },
  { key: '⌘+Enter', description: 'Open detail panel' },
  { key: 'N', description: 'Add item to current group' },
];

const GLOBAL_SHORTCUTS: ShortcutEntry[] = [
  { key: '/', description: 'Focus search' },
  { key: '?', description: 'Toggle this panel' },
];

function ShortcutSection({ title, shortcuts }: { title: string; shortcuts: ShortcutEntry[] }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
        {title}
      </h3>
      <div className="space-y-2">
        {shortcuts.map((s) => (
          <div key={s.key} className="flex items-center justify-between">
            <span className="text-sm text-slate-600">{s.description}</span>
            <kbd className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-500">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShortcutHelpPanel({ isOpen, onClose }: ShortcutHelpPanelProps) {
  return (
    <SlideOverPanel isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
      <ShortcutSection title="Navigation" shortcuts={NAVIGATION_SHORTCUTS} />
      <ShortcutSection title="Actions" shortcuts={ACTION_SHORTCUTS} />
      <ShortcutSection title="Global" shortcuts={GLOBAL_SHORTCUTS} />
    </SlideOverPanel>
  );
}
