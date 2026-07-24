'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Responsive, WidthProvider, Layout, LayoutItem } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';
import { fetchWidgets, updateWidgetLayouts } from '../../actions/widgets';
import WidgetCard from './WidgetCard';
import WidgetPicker from './WidgetPicker';
import { widgetRegistry } from './widgetRegistry';
import { BoardPeriodProvider } from './BoardPeriodProvider';
import { BoardPeriodPicker } from './BoardPeriodPicker';

const ResponsiveGrid = WidthProvider(Responsive);

interface DashboardWidget {
  id: string;
  widgetType: string;
  title: string;
  config: Record<string, unknown>;
  layout: { x: number; y: number; w: number; h: number };
}

interface DashboardCanvasProps {
  boardId: string;
  viewId: string;
  canEdit: boolean;
}

export default function DashboardCanvas({ boardId, viewId, canEdit }: DashboardCanvasProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadWidgets = useCallback(async () => {
    const data = await fetchWidgets(boardId, viewId);
    setWidgets(data);
  }, [boardId, viewId]);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  const layouts: Layout = widgets.map((w) => ({
    i: w.id,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
    minW: 2,
    minH: 2,
  }));

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      if (!canEdit) return;
      const changed = (newLayout as readonly LayoutItem[])
        .filter((item) => {
          const widget = widgets.find((w) => w.id === item.i);
          if (!widget) return false;
          return (
            widget.layout.x !== item.x ||
            widget.layout.y !== item.y ||
            widget.layout.w !== item.w ||
            widget.layout.h !== item.h
          );
        })
        .map((item) => ({
          id: item.i,
          layout: { x: item.x, y: item.y, w: item.w, h: item.h },
        }));

      if (changed.length === 0) return;

      startTransition(async () => {
        await updateWidgetLayouts(boardId, viewId, changed);
        setWidgets((prev) =>
          prev.map((w) => {
            const update = changed.find((c) => c.id === w.id);
            return update ? { ...w, layout: update.layout } : w;
          })
        );
      });
    },
    [boardId, viewId, canEdit, widgets]
  );

  const showPeriodPicker = widgets.some(
    (w) => widgetRegistry[w.widgetType]?.timeAware === true,
  );

  if (widgets.length === 0 && !isPending) {
    return (
      <BoardPeriodProvider>
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <svg
            className="w-16 h-16 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"
            />
          </svg>
          <p className="text-lg font-medium mb-2">No widgets yet</p>
          {canEdit && (
            <button
              className="mt-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors"
              onClick={() => setShowPicker(true)}
            >
              Add your first widget
            </button>
          )}
          {showPicker && (
            <WidgetPicker
              boardId={boardId}
              viewId={viewId}
              onClose={() => setShowPicker(false)}
              onAdded={loadWidgets}
            />
          )}
        </div>
      </BoardPeriodProvider>
    );
  }

  return (
    <BoardPeriodProvider>
      <div className="p-4">
        <div className="flex items-center justify-end gap-2 mb-3">
          {showPeriodPicker && <BoardPeriodPicker />}
          {canEdit && (
            <button
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={() => setShowPicker(true)}
            >
              + Add Widget
            </button>
          )}
        </div>

      <ResponsiveGrid
        className="layout"
        layouts={{ lg: layouts }}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 8, sm: 4 }}
        rowHeight={80}
        isDraggable={canEdit}
        isResizable={canEdit}
        onLayoutChange={handleLayoutChange}
      >
        {widgets.map((widget) => {
          const WidgetComponent = widgetRegistry[widget.widgetType]?.component;
          return (
            <div key={widget.id}>
              <WidgetCard
                boardId={boardId}
                viewId={viewId}
                widgetId={widget.id}
                title={widget.title}
                canEdit={canEdit}
              >
                {WidgetComponent ? (
                  <WidgetComponent boardId={boardId} config={widget.config} />
                ) : (
                  <p className="text-sm text-slate-400">Unknown widget type</p>
                )}
              </WidgetCard>
            </div>
          );
        })}
      </ResponsiveGrid>

      {showPicker && (
        <WidgetPicker
          boardId={boardId}
          viewId={viewId}
          onClose={() => setShowPicker(false)}
          onAdded={loadWidgets}
        />
      )}
    </div>
    </BoardPeriodProvider>
  );
}
