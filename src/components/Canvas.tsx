import { Fragment, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  useDroppable,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { AppState, CanvasItem } from '../types';
import { isBlock } from '../types';
import { cn } from '../lib/cn';
import { gapId, parseSidebarTool } from '../lib/dnd';
import { BlockCard } from './BlockCard';
import { FooterBar } from './FooterBar';
import { HeaderBar } from './HeaderBar';
import { MarkerRow } from './MarkerRow';

export type HandleProps = {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
};

const emptyHandleProps: HandleProps = {
  attributes: {} as DraggableAttributes,
  listeners: undefined,
};

interface CanvasProps {
  canvasRef: RefObject<HTMLDivElement>;
  state: AppState;
  selectedId: string | null;
  exporting: boolean;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onMetaChange: (patch: Partial<AppState['meta']>) => void;
  onLabelChange: (id: string, label: string) => void;
  onCtaChange: (id: string, index: number, value: string) => void;
  onCtaRemove: (id: string, index: number) => void;
  onAddCta: (id: string) => void;
  onRemove: (id: string) => void;
}

function StickyPageHeader({ children }: { children: ReactNode }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const root = sentinel.closest('.canvas-scroll');
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { root: root instanceof Element ? root : null, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />
      <div
        className={cn(
          'sticky top-0 z-30 -mx-5 bg-canvas px-5 pt-[30px] pb-4 transition-shadow duration-200 sm:-mx-14 sm:px-14 lg:-mx-16 lg:px-16',
          stuck && 'shadow-[0_2px_8px_rgba(15,23,42,0.08)]',
        )}
      >
        {children}
      </div>
    </>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handleProps: HandleProps, isOver: boolean) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 20 : undefined,
      }}
    >
      {children({ attributes, listeners }, isOver)}
    </div>
  );
}

function ItemView({
  item,
  selected,
  exporting,
  handleProps,
  ctaDropReady,
  isOverlay,
  onSelect,
  onLabelChange,
  onCtaChange,
  onCtaRemove,
  onAddCta,
  onRemove,
}: {
  item: CanvasItem;
  selected: boolean;
  exporting: boolean;
  handleProps: HandleProps;
  ctaDropReady?: boolean;
  isOverlay?: boolean;
  onSelect: () => void;
  onLabelChange: (label: string) => void;
  onCtaChange: (index: number, value: string) => void;
  onCtaRemove: (index: number) => void;
  onAddCta: () => void;
  onRemove: () => void;
}) {
  if (isBlock(item)) {
    return (
      <BlockCard
        item={item}
        selected={selected}
        exporting={exporting}
        handleProps={handleProps}
        ctaDropReady={ctaDropReady}
        isOverlay={isOverlay}
        onSelect={onSelect}
        onLabelChange={onLabelChange}
        onCtaChange={onCtaChange}
        onCtaRemove={onCtaRemove}
        onAddCta={onAddCta}
        onRemove={onRemove}
      />
    );
  }

  return (
    <MarkerRow
      item={item}
      selected={selected}
      exporting={exporting}
      handleProps={handleProps}
      isOverlay={isOverlay}
      onSelect={onSelect}
    />
  );
}

function DropGap({ index, enabled }: { index: number; enabled: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: gapId(index), disabled: !enabled });
  if (!enabled) return null;

  return (
    <div ref={setNodeRef} className="relative z-10 -my-2 h-5 shrink-0">
      {isOver && (
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_0_3px_rgba(59,130,246,0.18)]" />
      )}
    </div>
  );
}

function EmptyState({ dropEnabled }: { dropEnabled: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: gapId(0), disabled: !dropEnabled });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/60 px-8 py-16 text-center',
        dropEnabled && 'border-accent/40',
        isOver && 'border-solid border-accent bg-blue-50/70',
      )}
    >
      <div>
        <p className="text-[15px] font-medium text-gray-600">Your page is empty</p>
        <p className="mt-1 text-sm text-gray-400">
          Add a Focus Point or Content Block from the sidebar to start mapping hierarchy.
        </p>
        <a
          href="/ContentBlocks-Introduction.pdf"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="mt-5 inline-flex items-center justify-center rounded-md border border-[#3B82F6] bg-white px-4 py-2 text-[13px] font-medium text-[#3B82F6] hover:bg-blue-50"
        >
          Learn How
        </a>
      </div>
    </div>
  );
}

export function CanvasItemPreview({ item }: { item: CanvasItem }) {
  return (
    <ItemView
      item={item}
      selected={false}
      exporting
      isOverlay
      handleProps={emptyHandleProps}
      onSelect={() => undefined}
      onLabelChange={() => undefined}
      onCtaChange={() => undefined}
      onCtaRemove={() => undefined}
      onAddCta={() => undefined}
      onRemove={() => undefined}
    />
  );
}

export function Canvas({
  canvasRef,
  state,
  selectedId,
  exporting,
  activeId,
  onSelect,
  onMetaChange,
  onLabelChange,
  onCtaChange,
  onCtaRemove,
  onAddCta,
  onRemove,
}: CanvasProps) {
  const tool = activeId ? parseSidebarTool(activeId) : null;
  const showGaps = Boolean(tool && tool !== 'cta');
  const ctaDrag = tool === 'cta';
  const ids = state.items.map((item) => item.id);

  return (
    <div
      ref={canvasRef}
      onClick={() => onSelect(null)}
      className="min-h-full bg-canvas px-5 pb-10 sm:px-14 lg:px-16"
    >
      <StickyPageHeader>
        <HeaderBar meta={state.meta} onChange={onMetaChange} />
      </StickyPageHeader>

      <div className="mt-[34px] mb-16">
        {state.items.length === 0 ? (
          !exporting && <EmptyState dropEnabled={Boolean(tool)} />
        ) : (
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {state.items.map((item, index) => (
                <Fragment key={item.id}>
                  {index === 0 && <DropGap index={0} enabled={showGaps} />}
                  <SortableRow id={item.id}>
                    {(handleProps, isOver) => (
                      <ItemView
                        item={item}
                        selected={selectedId === item.id}
                        exporting={exporting}
                        handleProps={handleProps}
                        ctaDropReady={ctaDrag && isOver && isBlock(item)}
                        onSelect={() => onSelect(item.id)}
                        onLabelChange={(label) => onLabelChange(item.id, label)}
                        onCtaChange={(ctaIndex, value) => onCtaChange(item.id, ctaIndex, value)}
                        onCtaRemove={(ctaIndex) => onCtaRemove(item.id, ctaIndex)}
                        onAddCta={() => onAddCta(item.id)}
                        onRemove={() => onRemove(item.id)}
                      />
                    )}
                  </SortableRow>
                  <DropGap index={index + 1} enabled={showGaps} />
                </Fragment>
              ))}
            </div>
          </SortableContext>
        )}
      </div>

      <FooterBar meta={state.meta} onChange={onMetaChange} />
    </div>
  );
}
