import type { AppState } from '../types';
import { buildSharePath } from './shareApi';

export function liveSharePath(id: string): string {
  return buildSharePath(id);
}

export function replaceLocationWithLiveShare(id: string): void {
  history.replaceState(null, '', liveSharePath(id));
}

export function stripLocationHash(): void {
  if (typeof window === 'undefined' || !window.location.hash) return;
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

/** Pages with no canvas items must not create or overwrite a saved URL. */
export function hasShareableContent(state: Pick<AppState, 'items'>): boolean {
  return state.items.length > 0;
}

export function shouldAutoPromoteToLiveShare(
  ready: boolean,
  liveShareId: string | null,
  state: Pick<AppState, 'items'>,
  hashLoadError = false,
): boolean {
  return ready && !hashLoadError && liveShareId === null && hasShareableContent(state);
}
