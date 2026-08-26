import { useEffect, useRef } from 'react';
import type { HandleProps } from './Canvas';
import type { BlockItem } from '../types';
import { cn } from '../lib/cn';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { DragHandle } from './Icons';
import { InlineEdit } from './InlineEdit';
import { RichLabel } from './RichLabel';

const COMPACT_VIEWPORT_QUERY = '(max-width: 1023px)';

interface BlockCardProps {
  item: BlockItem;
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
}

function CtaChip({
  label,
  selected,
  exporting,
  onChange,
  onRemove,
  fillClass,
}: {
  label: string;
  selected: boolean;
  exporting: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
  fillClass: string;
}) {
  return (
    <div className="group/cta relative shrink-0">
      <div
        className={cn(
          'flex min-h-[34px] items-center rounded-md border border-[#3B82F6] px-3 text-[13px] font-medium text-[#3B82F6]',
          fillClass,
        )}
      >
        <InlineEdit
          value={label}
          onChange={onChange}
          placeholder="CTA"
          fullWidth={false}
          displayMaxLength={20}
          className="whitespace-nowrap font-block text-[13px] font-medium tracking-[0.02em] text-[#3B82F6]"
        />
      </div>
      {selected && !exporting && (
        <button
          type="button"
          aria-label="Remove CTA"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-gray-500 text-[10px] leading-none text-white group-hover/cta:flex"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function BlockCard({
  item,
  selected,
  exporting,
  handleProps,
  ctaDropReady = false,
  isOverlay = false,
  onSelect,
  onLabelChange,
  onCtaChange,
  onCtaRemove,
  onAddCta,
  onRemove,
}: BlockCardProps) {
  const isFocus = item.type === 'focus';
  const hasEntered = useRef(false);
  const shouldEnter = !isOverlay && !hasEntered.current;
  const isCompactViewport = useMediaQuery(COMPACT_VIEWPORT_QUERY);

  useEffect(() => {
    hasEntered.current = true;
  }, []);

  const requestRemove = () => {
    if (isCompactViewport && !window.confirm('Delete this block?')) return;
    onRemove();
  };

  return (
    <div className="group/block relative">
      <div
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        className={cn(
          'block-row relative flex items-center gap-3 rounded-lg px-3 pr-8 select-none',
          shouldEnter && 'block-enter',
          isFocus ? 'min-h-[92px] bg-white py-4' : 'min-h-[66px] bg-block py-3',
          isFocus && 'border-[1.5px] border-accent',
          selected && !exporting && !isFocus && 'ring-2 ring-accent/80 ring-offset-2 ring-offset-canvas',
          !isOverlay &&
            (selected && !exporting && isFocus
              ? 'shadow-[0_1px_2px_rgba(15,23,42,0.07),0_0_0_3px_rgba(59,130,246,0.22)]'
              : 'shadow-[0_1px_2px_rgba(15,23,42,0.07)]'),
          ctaDropReady && 'ring-2 ring-accent',
          isOverlay && 'shadow-lg',
        )}
      >
        <button
          type="button"
          aria-label="Drag to reorder"
          className="flex h-10 w-8 shrink-0 touch-none cursor-grab items-center justify-center text-slate-400 hover:text-slate-500 active:cursor-grabbing"
          {...handleProps.attributes}
          {...handleProps.listeners}
        >
          <DragHandle className="h-4 w-2.5" />
        </button>

        <div className="min-w-0 flex-1 py-1 select-text">
          <RichLabel
            value={item.label}
            onChange={onLabelChange}
            placeholder={isFocus ? 'Focus Point' : 'Content Block'}
            className="whitespace-pre-wrap break-words font-block text-[15px] tracking-[0.02em] text-gray-700"
          />
        </div>

        <div className="cta-group flex shrink-0 items-center justify-end gap-2">
          {item.ctas.map((cta, index) => (
            <CtaChip
              key={`${item.id}-cta-${index}`}
              label={cta}
              selected={selected}
              exporting={exporting}
              onChange={(value) => onCtaChange(index, value)}
              onRemove={() => onCtaRemove(index)}
              fillClass={isFocus ? 'bg-white' : 'bg-block'}
            />
          ))}
          {!exporting && !isOverlay && item.ctas.length < 2 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onAddCta();
              }}
              className={cn(
                'rounded-md border border-dashed border-accent/50 px-2 py-1.5 text-[11px] font-medium text-accent/80 hover:bg-blue-50',
                'hidden group-hover/block:flex',
                selected && 'flex',
              )}
            >
              Add CTA
            </button>
          )}
        </div>
      </div>

      {!exporting && !isOverlay && (
        <button
          type="button"
          aria-label="Delete block"
          tabIndex={-1}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            requestRemove();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className={cn(
            'absolute -right-[13px] -top-[13px] z-30 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#5C6E91] shadow-[0_2px_6px_rgba(15,23,42,0.35)] hover:bg-[#4A5A78]',
            'opacity-0 transition-opacity duration-75',
            'group-hover/block:opacity-100',
            selected && 'opacity-100',
          )}
        >
          <img src="/icons/delete.svg" alt="" draggable={false} className="pointer-events-none h-3 w-3" />
        </button>
      )}
    </div>
  );
}
