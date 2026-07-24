'use client';

import { useState, useTransition } from 'react';
import { updateWidget } from '../../actions/widgets';
import { widgetRegistry } from './widgetRegistry';

interface WidgetConfigModalProps {
  boardId: string;
  viewId: string;
  widgetId: string;
  widgetType: string;
  currentConfig: Record<string, unknown>;
  onClose: () => void;
  onUpdated: () => void;
}

export default function WidgetConfigModal({
  boardId,
  viewId,
  widgetId,
  widgetType,
  currentConfig,
  onClose,
  onUpdated,
}: WidgetConfigModalProps) {
  const definition = widgetRegistry[widgetType];
  const fields = definition?.configFields ?? [];
  const [config, setConfig] = useState<Record<string, unknown>>({ ...currentConfig });
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      await updateWidget(boardId, viewId, widgetId, { config });
      onUpdated();
      onClose();
    });
  };

  if (fields.length === 0) {
    return (
      <div
        className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-xl p-6 w-80"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm text-slate-500">This widget has no configurable options.</p>
          <button
            className="mt-4 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-96 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-slate-800 mb-4">Configure Widget</h3>

        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                  value={String(config[field.key] ?? field.default)}
                  onChange={(e) => {
                    const val =
                      field.options?.find((o) => String(o.value) === e.target.value)?.value ??
                      e.target.value;
                    setConfig({ ...config, [field.key]: val });
                  }}
                >
                  {field.options?.map((opt) => (
                    <option key={String(opt.value)} value={String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                  value={Number(config[field.key] ?? field.default)}
                  onChange={(e) =>
                    setConfig({ ...config, [field.key]: Number(e.target.value) })
                  }
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
