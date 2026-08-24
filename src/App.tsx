import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { v4 as uuid } from 'uuid';
import { Canvas, CanvasItemPreview } from './components/Canvas';
import { Sidebar, SidebarToolPreview } from './components/Sidebar';
import { SharedPageNotice } from './components/SharedPageNotice';
import { Toast } from './components/Toast';
import { useContentBlocks } from './hooks/useContentBlocks';
import { exportNodeToPng } from './lib/export';
import {
  isSidebarToolId,
  parseGapIndex,
  parseSidebarTool,
} from './lib/dnd';
import type { CanvasItem } from './types';

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'page'
  );
}

function createToolItem(tool: 'focus' | 'content' | 'fold' | 'footer'): CanvasItem {
  if (tool === 'focus') {
    return { id: uuid(), type: 'focus', label: 'Focus Point', ctas: [] };
  }
  if (tool === 'content') {
    return { id: uuid(), type: 'content', label: 'Content Block', ctas: [] };
  }
  return { id: uuid(), type: tool };
}

export default function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragOccurredRef = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const {
    ready,
    state,
    selectedId,
    toast,
    exporting,
    setExporting,
    setSelectedId,
    showToast,
    insertItemAt,
    addFocusPoint,
    addContentBlock,
    addMarker,
    addCta,
    updateMeta,
    updateBlock,
    updateCta,
    removeCta,
    removeItem,
    reorder,
    openNewPage,
    share,
    liveShareId,
    loadingSharedPage,
    sharedPageLoadError,
    saveStatus,
    reloadSharedPage,
  } = useContentBlocks();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const collisionDetection: CollisionDetection = useCallback((args) => {
    const tool = parseSidebarTool(String(args.active.id));
    if (tool === 'cta') {
      const blocks = args.droppableContainers.filter((container) => {
        const id = String(container.id);
        return !isSidebarToolId(id) && parseGapIndex(id) === null;
      });
      return closestCenter({ ...args, droppableContainers: blocks });
    }
    if (tool) {
      const pointerHits = pointerWithin(args);
      const gaps = pointerHits.filter((hit) => parseGapIndex(String(hit.id)) !== null);
      if (gaps.length > 0) return gaps;
      if (pointerHits.length > 0) return pointerHits;
    }
    return closestCenter(args);
  }, []);

  const unlessDrag = useCallback((action: () => void) => {
    return () => {
      if (dragOccurredRef.current) return;
      action();
    };
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    dragOccurredRef.current = true;
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const currentActiveId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : null;
      setActiveId(null);
      window.setTimeout(() => {
        dragOccurredRef.current = false;
      }, 40);

      const tool = parseSidebarTool(currentActiveId);
      if (tool) {
        if (tool === 'cta') {
          if (overId && parseGapIndex(overId) === null && !isSidebarToolId(overId)) {
            addCta(overId);
          } else {
            showToast('Drop onto a Focus Point or Content Block');
          }
          return;
        }

        if (tool === 'fold' || tool === 'footer') {
          const existing = state.items.find((item) => item.type === tool);
          if (existing) {
            setSelectedId(existing.id);
            showToast(
              tool === 'fold' ? 'The Fold is already on the canvas' : 'The Footer is already on the canvas',
            );
            return;
          }
        }

        let index = state.items.length;
        const gapIndex = overId ? parseGapIndex(overId) : null;
        if (gapIndex !== null) {
          index = gapIndex;
        } else if (overId && !isSidebarToolId(overId)) {
          const overIndex = state.items.findIndex((item) => item.id === overId);
          if (overIndex >= 0) index = overIndex + 1;
        }

        insertItemAt(index, createToolItem(tool));
        return;
      }

      if (overId && overId !== currentActiveId && parseGapIndex(overId) === null && !isSidebarToolId(overId)) {
        reorder(currentActiveId, overId);
      }
    },
    [addCta, insertItemAt, reorder, setSelectedId, showToast, state.items],
  );

  const exportPng = useCallback(async () => {
    const node = canvasRef.current;
    if (!node) return;

    setSelectedId(null);
    setExporting(true);

    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      await document.fonts.ready;

      await exportNodeToPng(
        node,
        `content-blocks-${slugify(state.meta.page)}-v${slugify(state.meta.version)}.png`,
      );
    } catch {
      showToast('Export failed');
    } finally {
      setExporting(false);
    }
  }, [setExporting, setSelectedId, showToast, state.meta.page, state.meta.version]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 'Escape') {
        setSelectedId(null);
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        removeItem(selectedId);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [removeItem, selectedId, setSelectedId]);

  if (!ready || loadingSharedPage) {
    return (
      <div className="flex h-screen">
        <div className="w-sidebar bg-sidebar" />
        <div className="flex-1 bg-canvas" />
      </div>
    );
  }

  if (sharedPageLoadError) {
    return (
      <div className="flex h-screen">
        <div className="w-sidebar bg-sidebar" />
        <div className="flex flex-1 items-center justify-center bg-canvas px-6">
          <div className="max-w-md text-center">
            <h1 className="text-lg font-semibold text-slate-900">Could not load shared page</h1>
            <p className="mt-2 text-sm text-slate-600">
              This shared link could not be loaded. The page was not modified.
            </p>
            <button
              type="button"
              onClick={reloadSharedPage}
              className="mt-4 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeItem = activeId ? state.items.find((item) => item.id === activeId) ?? null : null;
  const activeTool = activeId ? parseSidebarTool(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        window.setTimeout(() => {
          dragOccurredRef.current = false;
        }, 40);
      }}
    >
      <div className="flex h-screen overflow-hidden bg-canvas">
        <Sidebar
          onAddFocus={unlessDrag(addFocusPoint)}
          onAddContent={unlessDrag(addContentBlock)}
          onAddCta={unlessDrag(() => addCta())}
          onAddFold={unlessDrag(() => addMarker('fold'))}
          onAddFooter={unlessDrag(() => addMarker('footer'))}
          onNew={openNewPage}
          onShare={() => void share()}
          onExport={() => void exportPng()}
        />

        <main className="canvas-scroll min-w-0 flex-1 overflow-auto">
          {liveShareId ? (
            <SharedPageNotice saveStatus={saveStatus} onReload={reloadSharedPage} />
          ) : null}
          <Canvas
            canvasRef={canvasRef}
            state={state}
            selectedId={exporting ? null : selectedId}
            exporting={exporting}
            activeId={activeId}
            onSelect={setSelectedId}
            onMetaChange={updateMeta}
            onLabelChange={(id, label) => updateBlock(id, { label })}
            onCtaChange={updateCta}
            onCtaRemove={removeCta}
            onAddCta={(id) => addCta(id)}
            onRemove={removeItem}
          />
        </main>

        <Toast message={toast} />
      </div>

      <DragOverlay dropAnimation={null} style={{ background: 'transparent', cursor: 'grabbing' }}>
        {activeItem ? <CanvasItemPreview item={activeItem} /> : null}
        {activeTool ? <SidebarToolPreview tool={activeTool} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
