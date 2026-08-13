export type BlockType = 'focus' | 'content';
export type MarkerType = 'fold' | 'footer';
export type ItemType = BlockType | MarkerType;

export interface BlockItem {
  id: string;
  type: BlockType;
  label: string;
  ctas: string[];
}

export interface MarkerItem {
  id: string;
  type: MarkerType;
}

export type CanvasItem = BlockItem | MarkerItem;

export interface Meta {
  page: string;
  client: string;
  version: string;
  preparedBy: string;
  contact: string;
}

export interface AppState {
  meta: Meta;
  items: CanvasItem[];
}

export function isBlock(item: CanvasItem): item is BlockItem {
  return item.type === 'focus' || item.type === 'content';
}

export function isMarker(item: CanvasItem): item is MarkerItem {
  return item.type === 'fold' || item.type === 'footer';
}
