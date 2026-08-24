import type { SaveStatus } from './shareApi';

export type SharedPageSaveUiState = {
  saving: boolean;
  saved: boolean;
  error: boolean;
  conflict: boolean;
};

export const INITIAL_SHARED_PAGE_SAVE_UI: SharedPageSaveUiState = {
  saving: false,
  saved: false,
  error: false,
  conflict: false,
};

export function reduceSharedPageSaveUi(
  prev: SharedPageSaveUiState,
  saveStatus: SaveStatus,
): SharedPageSaveUiState {
  switch (saveStatus) {
    case 'saving':
      return { saving: true, saved: false, error: false, conflict: false };
    case 'saved':
      return { saving: false, saved: true, error: false, conflict: false };
    case 'failed':
      return { saving: false, saved: false, error: true, conflict: false };
    case 'conflict':
      return { saving: false, saved: false, error: false, conflict: true };
    case 'idle':
    default:
      return {
        saving: false,
        saved: prev.saved,
        error: false,
        conflict: false,
      };
  }
}

export function sharedNoticeStorageKey(shareId: string): string {
  return `contentblocks:shared-notice:${shareId}`;
}

export function canUseSessionStorage(): boolean {
  try {
    const key = '__contentblocks_storage_test__';
    sessionStorage.setItem(key, '1');
    sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function wasSharedNoticeDismissed(shareId: string): boolean {
  if (!canUseSessionStorage()) return false;
  try {
    return sessionStorage.getItem(sharedNoticeStorageKey(shareId)) === '1';
  } catch {
    return false;
  }
}

export function markSharedNoticeDismissed(shareId: string): void {
  if (!canUseSessionStorage()) return;
  try {
    sessionStorage.setItem(sharedNoticeStorageKey(shareId), '1');
  } catch {
    // Ignore unavailable storage.
  }
}

export function sharedNoticeVisibleDurationMs(): number {
  return canUseSessionStorage() ? 7000 : 10000;
}

export const SHARED_NOTICE_FADE_MS = 200;
