import type { HandleProps } from './Canvas';
import type { MarkerItem } from '../types';
import { cn } from '../lib/cn';

interface MarkerRowProps {
  item: MarkerItem;
  selected: boolean;
  exporting: boolean;
  handleProps: HandleProps;
  isOverlay?: boolean;
  onSelect: () => void;
}

export function MarkerRow({
  item,
  selected,
  exporting,
  handleProps,
  isOverlay = false,
  onSelect,
}: MarkerRowProps) {
  const label = item.type === 'fold' ? 'THE FOLD' : 'FOOTER';

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      className={cn(
        'relative -my-1.5 flex touch-none items-center rounded-md py-1.5 cursor-grab active:cursor-grabbing',
        !isOverlay && 'block-enter',
        selected && !exporting && 'ring-2 ring-accent/40 ring-offset-2 ring-offset-canvas',
      )}
      {...handleProps.attributes}
      {...handleProps.listeners}
    >
      <div className="flex w-full items-center px-1">
        <span className="h-2.5 w-px shrink-0 bg-slate-300" />
        <span
          className="h-px flex-1"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to right, #cbd5e1 0 5px, transparent 5px 9px)',
          }}
        />
        <span className="mx-3 rounded-full bg-marker px-2.5 py-1 text-[10px] font-medium tracking-[0.16em] text-white">
          {label}
        </span>
        <span
          className="h-px flex-1"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to right, #cbd5e1 0 5px, transparent 5px 9px)',
          }}
        />
        <span className="h-2.5 w-px shrink-0 bg-slate-300" />
      </div>
    </div>
  );
}
