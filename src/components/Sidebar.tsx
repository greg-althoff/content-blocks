import type { ReactNode } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ExportIcon, PlusIcon, ShareIcon } from './Icons';
import { cn } from '../lib/cn';
import { SidebarToolId, type SidebarTool } from '../lib/dnd';

const TOOL_ICONS = {
  focus: '/icons/Icon_ Focus Point.png?v=4',
  content: '/icons/Icon_ Content Block.png?v=3',
  cta: '/icons/Icon_ Call to Action.png?v=4',
  fold: '/icons/Icon_ the Fold.png?v=3',
  footer: '/icons/Icon_ the Footer.png?v=3',
} as const;

interface SidebarProps {
  onAddFocus: () => void;
  onAddContent: () => void;
  onAddCta: () => void;
  onAddFold: () => void;
  onAddFooter: () => void;
  onNew: () => void;
  onShare: () => void;
  onExport: () => void;
}

function ToolButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-1 items-center justify-center rounded-lg border border-white/20 bg-transparent px-2 py-3 text-center text-[14px] leading-none tracking-[0.02em] text-white transition-colors hover:border-transparent hover:bg-sidebar-button"
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-white [&_svg]:block">
          {icon}
        </span>
        <span>{label}</span>
      </span>
    </button>
  );
}

function DraggableToolButton({
  id,
  iconSrc,
  label,
  onClick,
  iconClass = 'h-8 w-8',
  iconOffsetClass,
  paddingLeftClass = 'pl-[32px]',
}: {
  id: string;
  iconSrc: string;
  label: string;
  onClick: () => void;
  iconClass?: string;
  iconOffsetClass?: string;
  paddingLeftClass?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-[45px] w-full cursor-grab items-center justify-start gap-3 rounded-lg border border-white/20 bg-transparent py-0 pr-3.5 text-left text-[14px] leading-none tracking-[0.02em] text-white transition-colors hover:border-transparent hover:bg-sidebar-button active:cursor-grabbing',
        paddingLeftClass,
        isDragging && 'opacity-40',
      )}
      {...listeners}
      {...attributes}
    >
      <span className={cn('flex shrink-0 items-center justify-start', iconClass)}>
        <img src={iconSrc} alt="" className={cn(iconClass, 'object-contain', iconOffsetClass)} />
      </span>
      <span>{label}</span>
    </button>
  );
}

export function SidebarToolPreview({ tool }: { tool: SidebarTool }) {
  if (tool === 'cta') {
    return (
      <div className="rounded-md border border-[#3B82F6] bg-white px-3 py-1.5 text-[13px] font-medium text-[#3B82F6] shadow-lg">
        Learn More
      </div>
    );
  }

  if (tool === 'fold' || tool === 'footer') {
    const label = tool === 'fold' ? 'THE FOLD' : 'FOOTER';
    return (
      <div className="flex w-[420px] items-center rounded-md bg-canvas px-1 py-1.5 shadow-lg">
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
    );
  }

  const isFocus = tool === 'focus';
  return (
    <div
      className={cn(
        'flex w-[420px] items-center rounded-lg px-4 shadow-lg',
        isFocus ? 'min-h-[92px] border-[1.5px] border-accent bg-white' : 'min-h-[66px] bg-block',
      )}
    >
      <span className="text-[15px] font-block tracking-[0.02em] text-gray-700">
        {isFocus ? 'Focus Point' : 'Content Block'}
      </span>
    </div>
  );
}

export function Sidebar({
  onAddFocus,
  onAddContent,
  onAddCta,
  onAddFold,
  onAddFooter,
  onNew,
  onShare,
  onExport,
}: SidebarProps) {
  return (
    <aside className="flex h-full w-sidebar shrink-0 flex-col overflow-y-auto bg-sidebar text-white">
      <div className="flex justify-center px-5 pb-6 pt-6">
        <img src="/CBlocks-Logo.png" alt="ContentBlocks" width={160} className="h-auto w-[160px]" />
      </div>

      <nav className="flex flex-1 flex-col gap-2 px-4">
        <DraggableToolButton
          id={SidebarToolId.focus}
          iconSrc={TOOL_ICONS.focus}
          label="Focus Point"
          onClick={onAddFocus}
          iconClass="h-6 w-6"
        />
        <DraggableToolButton
          id={SidebarToolId.content}
          iconSrc={TOOL_ICONS.content}
          label="Content Block"
          onClick={onAddContent}
          iconClass="h-5 w-5"
        />
        <DraggableToolButton
          id={SidebarToolId.cta}
          iconSrc={TOOL_ICONS.cta}
          label="Call to Action"
          onClick={onAddCta}
          iconClass="h-8 w-[28px]"
          iconOffsetClass="relative top-[3px]"
          paddingLeftClass="pl-[29px]"
        />
        <DraggableToolButton
          id={SidebarToolId.fold}
          iconSrc={TOOL_ICONS.fold}
          label="the Fold"
          onClick={onAddFold}
        />
        <DraggableToolButton
          id={SidebarToolId.footer}
          iconSrc={TOOL_ICONS.footer}
          label="the Footer"
          onClick={onAddFooter}
        />
      </nav>

      <div className="mt-auto flex flex-col gap-2 px-4 pb-[42px]">
        <button
          type="button"
          onClick={onShare}
          className="flex w-full items-center justify-center rounded-lg bg-accent px-3.5 py-3 text-[14px] font-medium leading-none text-white transition-colors hover:bg-accent-dark"
        >
          <span className="inline-flex items-center gap-1.5">
            <ShareIcon className="block h-5 w-5" />
            Share
          </span>
        </button>
        <div className="flex gap-3">
          <ToolButton icon={<PlusIcon className="h-4 w-4" />} label="New" onClick={onNew} />
          <ToolButton icon={<ExportIcon className="h-4 w-4" />} label="Export PNG" onClick={onExport} />
        </div>
      </div>

      <div className="px-5 pb-5 pt-2 text-center text-[10px] font-medium uppercase tracking-[0.22em] text-gray-500">
        <a
          href="https://www.creativeisles.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block hover:underline hover:decoration-dotted hover:underline-offset-2"
        >
          © Creative Isles
        </a>
        <div className="pt-1.5 text-white">VER 1.0</div>
      </div>
    </aside>
  );
}
