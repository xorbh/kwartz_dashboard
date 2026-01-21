import { useState, useCallback, useEffect, useRef } from 'react';
import { GridLayout, verticalCompactor } from 'react-grid-layout';
import type { Layout, LayoutItem } from 'react-grid-layout';
import {
  fetchWidgets,
  createWidget,
  updateWidget,
  deleteWidget,
  bulkUpdateLayout,
} from '../api/widgets';
import type { Widget, WidgetCreate, WidgetUpdate } from '../api/widgets';
import { HtmlWidget } from './HtmlWidget';
import { WidgetConfigModal } from './WidgetConfigModal';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const GRID_COLS = 12;
const ROW_HEIGHT = 100;

export function Dashboard() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);

  // Track pending layout changes for debounced save
  const pendingLayoutRef = useRef<Layout | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // Load widgets from backend
  useEffect(() => {
    async function loadWidgets() {
      try {
        setLoading(true);
        const data = await fetchWidgets();
        setWidgets(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load widgets');
      } finally {
        setLoading(false);
      }
    }

    loadWidgets();
  }, []);

  // Track container width for grid
  useEffect(() => {
    const updateWidth = () => {
      const container = document.querySelector('.dashboard-container');
      if (container) {
        setContainerWidth(container.clientWidth - 32);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Debounced layout save
  const saveLayout = useCallback(async (layout: Layout) => {
    const layoutUpdates = layout.map((item: LayoutItem) => ({
      id: item.i,
      layout: {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: item.minW ?? 2,
        minH: item.minH ?? 2,
      },
    }));

    try {
      await bulkUpdateLayout(layoutUpdates);
    } catch (err) {
      console.error('Failed to save layout:', err);
    }
  }, []);

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      // Update local state immediately
      setWidgets((prev) =>
        prev.map((widget) => {
          const layoutItem = newLayout.find((l: LayoutItem) => l.i === widget.id);
          if (layoutItem) {
            return {
              ...widget,
              layout: {
                x: layoutItem.x,
                y: layoutItem.y,
                w: layoutItem.w,
                h: layoutItem.h,
                minW: widget.layout.minW,
                minH: widget.layout.minH,
              },
            };
          }
          return widget;
        })
      );

      // Debounce backend save
      pendingLayoutRef.current = newLayout;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        if (pendingLayoutRef.current) {
          saveLayout(pendingLayoutRef.current);
          pendingLayoutRef.current = null;
        }
      }, 500);
    },
    [saveLayout]
  );

  const handleAddWidget = useCallback(() => {
    setEditingWidget(null);
    setModalOpen(true);
  }, []);

  const handleEditWidget = useCallback((widget: Widget) => {
    setEditingWidget(widget);
    setModalOpen(true);
  }, []);

  const handleSaveWidget = useCallback(
    async (data: WidgetCreate | WidgetUpdate) => {
      try {
        if (editingWidget) {
          const updated = await updateWidget(editingWidget.id, data as WidgetUpdate);
          setWidgets((prev) =>
            prev.map((w) => (w.id === updated.id ? updated : w))
          );
        } else {
          const created = await createWidget(data as WidgetCreate);
          setWidgets((prev) => [...prev, created]);
        }
        setModalOpen(false);
        setEditingWidget(null);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to save widget');
      }
    },
    [editingWidget]
  );

  const handleDeleteWidget = useCallback(async (id: string) => {
    if (!confirm('Delete this widget?')) return;

    try {
      await deleteWidget(id);
      setWidgets((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete widget');
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingWidget(null);
  }, []);

  const layout: Layout = widgets.map((w) => ({
    i: w.id,
    x: w.layout.x,
    y: w.layout.y,
    w: w.layout.w,
    h: w.layout.h,
    minW: w.layout.minW,
    minH: w.layout.minH,
  }));

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="dashboard-actions">
          <button onClick={handleAddWidget} className="btn-primary">
            Add Widget
          </button>
        </div>
      </header>

      {widgets.length === 0 ? (
        <div className="empty-state">
          <p>No widgets configured. Click "Add Widget" to get started.</p>
        </div>
      ) : (
        <GridLayout
          className="layout"
          layout={layout}
          width={containerWidth}
          gridConfig={{
            cols: GRID_COLS,
            rowHeight: ROW_HEIGHT,
          }}
          dragConfig={{
            handle: '.widget-header',
          }}
          compactor={verticalCompactor}
          onLayoutChange={handleLayoutChange}
        >
          {widgets.map((widget) => (
            <div key={widget.id} className="widget-container">
              <button
                className="widget-remove"
                onClick={() => handleDeleteWidget(widget.id)}
                title="Remove widget"
              >
                ×
              </button>
              <HtmlWidget
                widgetId={widget.id}
                name={widget.name}
                onEdit={() => handleEditWidget(widget)}
              />
            </div>
          ))}
        </GridLayout>
      )}

      {modalOpen && (
        <WidgetConfigModal
          widget={editingWidget}
          onSave={handleSaveWidget}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
