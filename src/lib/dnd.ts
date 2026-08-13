export const SIDEBAR_PREFIX = 'sidebar:';
export const GAP_PREFIX = 'gap:';

export const SidebarToolId = {
  focus: 'sidebar:focus',
  content: 'sidebar:content',
  cta: 'sidebar:cta',
  fold: 'sidebar:fold',
  footer: 'sidebar:footer',
} as const;

export type SidebarTool = 'focus' | 'content' | 'cta' | 'fold' | 'footer';

export function isSidebarToolId(id: string): boolean {
  return id.startsWith(SIDEBAR_PREFIX);
}

export function parseSidebarTool(id: string): SidebarTool | null {
  if (!id.startsWith(SIDEBAR_PREFIX)) return null;
  return id.slice(SIDEBAR_PREFIX.length) as SidebarTool;
}

export function gapId(index: number): string {
  return `${GAP_PREFIX}${index}`;
}

export function parseGapIndex(id: string): number | null {
  if (!id.startsWith(GAP_PREFIX)) return null;
  const index = Number(id.slice(GAP_PREFIX.length));
  return Number.isFinite(index) ? index : null;
}
