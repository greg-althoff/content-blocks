import { useState, type ReactNode } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ExportIcon, PlusIcon, ShareIcon } from './Icons';
import { cn } from '../lib/cn';
import { SidebarToolId, type SidebarTool } from '../lib/dnd';
import { useMediaQuery } from '../hooks/useMediaQuery';

const TOOL_ICONS = {
  focus: '/icons/Icon_ Focus Point.png?v=4',
  content: '/icons/Icon_ Content Block.png?v=3',
  cta: '/icons/Icon_ Call to Action.png?v=4',
  fold: '/icons/Icon_ the Fold.png?v=3',
  footer: '/icons/Icon_ the Footer.png?v=3',
} as const;

// Sized at 65% of their original (66x62 button / 32-40px icon) footprint.
const CONDENSED_TOOL_ICONS = {
  focus: { src: '/icons/condensed-focuspoint.svg', className: 'h-[21px] w-[21px]' },
  content: { src: '/icons/condensed-content-block.svg', className: 'h-auto w-[23px]' },
  cta: { src: '/icons/condensed-cta.svg', className: 'h-auto w-[21px]' },
  fold: { src: '/icons/condensed-fold.svg', className: 'h-auto w-[26px]' },
  footer: { src: '/icons/condensed-footer.svg', className: 'h-auto w-[26px]' },
} as const;

const PHONE_MEDIA_QUERY = '(max-width: 639px)';

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
      className="flex h-[45px] w-full items-center justify-center gap-1.5 rounded-lg border border-transparent bg-[#454A4F] px-3 text-center text-[13px] leading-none tracking-[0.02em] text-white transition-colors hover:bg-accent lg:text-[14px]"
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-white [&_svg]:block">
        {icon}
      </span>
      <span>{label}</span>
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
        'flex h-[45px] w-full touch-none cursor-grab items-center justify-start gap-3 rounded-lg border border-white/20 bg-transparent py-0 pr-3.5 text-left text-[13px] leading-none tracking-[0.02em] text-white transition-colors hover:border-transparent hover:bg-sidebar-button active:cursor-grabbing lg:text-[14px]',
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

function CondensedToolButton({
  id,
  iconSrc,
  iconClass,
  label,
  onClick,
}: {
  id: string;
  iconSrc: string;
  iconClass: string;
  label: string;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-[40px] w-[43px] shrink-0 touch-none cursor-grab items-center justify-center rounded-lg border border-white/20 bg-transparent transition-colors hover:border-transparent hover:bg-sidebar-button active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      {...listeners}
      {...attributes}
    >
      <img src={iconSrc} alt="" className={cn(iconClass, 'object-contain')} />
    </button>
  );
}

function CondensedActionButton({
  icon,
  iconSrc,
  iconClass = 'h-4 w-4',
  label,
  onClick,
  variant = 'default',
}: {
  icon?: ReactNode;
  iconSrc?: string;
  iconClass?: string;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'accent' | 'outline';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-[40px] w-[43px] shrink-0 items-center justify-center rounded-lg border transition-colors',
        variant === 'default' && 'border-transparent bg-[#454A4F] text-white hover:bg-accent',
        variant === 'accent' && 'border-transparent bg-accent text-white hover:bg-accent-dark',
        variant === 'outline' &&
          'border-white/20 bg-transparent text-white hover:border-transparent hover:bg-sidebar-button',
      )}
    >
      {icon ? (
        <span className="flex h-4 w-4 items-center justify-center [&_svg]:block">{icon}</span>
      ) : iconSrc ? (
        <img src={iconSrc} alt="" className={cn(iconClass, 'object-contain')} />
      ) : null}
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
  const [manualCollapsed, setManualCollapsed] = useState(false);
  const isPhone = useMediaQuery(PHONE_MEDIA_QUERY);
  const collapsed = manualCollapsed || isPhone;

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-sidebar text-white transition-[width] duration-200',
        collapsed ? 'w-sidebar-condensed' : 'w-sidebar',
      )}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={() => setManualCollapsed(false)}
          aria-label="Expand sidebar"
          className="flex justify-center px-3 pb-3 pt-4"
        >
          <img src="/icons/condensed-logo.svg" alt="ContentBlocks" className="h-auto w-8" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setManualCollapsed(true)}
          aria-label="Collapse sidebar"
          className="group/logo flex w-full justify-center px-5 pb-8 pt-6"
        >
          <span className="relative inline-flex">
            <img src="/CBlocks-Logo.png" alt="ContentBlocks" width={160} className="h-auto w-[160px]" />
            {!isPhone && (
              <img
                src="/icons/sidebar-icon.svg"
                alt=""
                aria-hidden="true"
                className="absolute left-full top-1/2 ml-3 h-4 w-4 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover/logo:opacity-100"
              />
            )}
          </span>
        </button>
      )}

      <div className={cn(collapsed ? 'flex justify-center px-4' : 'px-4')}>
        {collapsed ? (
          <CondensedActionButton
            iconSrc="/icons/new-page-icon.svg"
            iconClass="h-[10px] w-[10px]"
            label="New Page"
            onClick={onNew}
          />
        ) : (
          <ToolButton icon={<PlusIcon className="h-4 w-4" />} label="New Page" onClick={onNew} />
        )}
      </div>

      <div
        className={cn('h-px w-full', collapsed ? 'my-2' : 'my-4')}
        style={{
          backgroundImage:
            'repeating-linear-gradient(to right, rgba(255,255,255,0.28) 0 2px, transparent 2px 5px)',
        }}
      />

      <nav
        className={cn(
          'flex flex-1 flex-col px-4',
          collapsed ? 'items-center gap-2.5' : 'gap-2',
        )}
      >
        {collapsed ? (
          <>
            <CondensedToolButton
              id={SidebarToolId.focus}
              iconSrc={CONDENSED_TOOL_ICONS.focus.src}
              iconClass={CONDENSED_TOOL_ICONS.focus.className}
              label="Focus Point"
              onClick={onAddFocus}
            />
            <CondensedToolButton
              id={SidebarToolId.content}
              iconSrc={CONDENSED_TOOL_ICONS.content.src}
              iconClass={CONDENSED_TOOL_ICONS.content.className}
              label="Content Block"
              onClick={onAddContent}
            />
            <CondensedToolButton
              id={SidebarToolId.cta}
              iconSrc={CONDENSED_TOOL_ICONS.cta.src}
              iconClass={CONDENSED_TOOL_ICONS.cta.className}
              label="Call to Action"
              onClick={onAddCta}
            />
            <CondensedToolButton
              id={SidebarToolId.fold}
              iconSrc={CONDENSED_TOOL_ICONS.fold.src}
              iconClass={CONDENSED_TOOL_ICONS.fold.className}
              label="the Fold"
              onClick={onAddFold}
            />
            <CondensedToolButton
              id={SidebarToolId.footer}
              iconSrc={CONDENSED_TOOL_ICONS.footer.src}
              iconClass={CONDENSED_TOOL_ICONS.footer.className}
              label="the Footer"
              onClick={onAddFooter}
            />
          </>
        ) : (
          <>
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
          </>
        )}
      </nav>

      <div
        className={cn(
          'mt-auto flex flex-col px-4',
          collapsed ? 'items-center gap-2.5 pb-2' : 'gap-2 pb-[42px]',
        )}
      >
        {collapsed ? (
          <>
            <CondensedActionButton
              icon={<ShareIcon className="h-4 w-4" />}
              label="Share"
              onClick={onShare}
              variant="accent"
            />
            <CondensedActionButton
              icon={<ExportIcon className="h-4 w-4" />}
              label="Export"
              onClick={onExport}
              variant="outline"
            />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onShare}
              className="flex w-full items-center justify-center rounded-lg bg-accent px-3.5 py-3 text-[13px] font-medium leading-none text-white transition-colors hover:bg-accent-dark lg:text-[14px]"
            >
              <span className="inline-flex items-center gap-1.5">
                <ShareIcon className="block h-5 w-5" />
                Share
              </span>
            </button>
            <button
              type="button"
              onClick={onExport}
              className="flex w-full items-center justify-center rounded-lg border border-white/20 bg-transparent px-3.5 py-3 text-[13px] leading-none tracking-[0.02em] text-white transition-colors hover:border-transparent hover:bg-sidebar-button lg:text-[14px]"
            >
              <span className="inline-flex items-center gap-1.5">
                <ExportIcon className="block h-5 w-5" />
                Export
              </span>
            </button>
          </>
        )}
      </div>

      {collapsed ? (
        <div className="flex justify-center px-3 pb-3 pt-1">
          <a
            href="https://www.creativeisles.com"
            target="_blank"
            rel="noopener noreferrer"
            className="opacity-90 transition-opacity hover:opacity-100"
          >
            <img src="/icons/condensed-isles.svg" alt="Creative Isles" className="h-auto w-12" />
          </a>
        </div>
      ) : (
        <div className="px-5 pb-5 pt-2 text-center text-[10px] font-medium uppercase tracking-[0.22em] text-gray-500">
          <a
            href="https://www.creativeisles.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block hover:underline hover:decoration-dotted hover:underline-offset-2"
          >
            © Creative Isles
          </a>
          <div className="pt-1.5 text-white">VER 1.2</div>
        </div>
      )}
    </aside>
  );
}
