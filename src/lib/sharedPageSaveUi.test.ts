import { describe, expect, it } from 'vitest';
import {
  INITIAL_SHARED_PAGE_SAVE_UI,
  reduceSharedPageSaveUi,
  sharedNoticeStorageKey,
  sharedNoticeVisibleDurationMs,
  SHARED_NOTICE_FADE_MS,
} from './sharedPageSaveUi';

describe('sharedPageSaveUi', () => {
  it('maps saving status to the saving pill state', () => {
    const next = reduceSharedPageSaveUi(
      { saving: false, saved: true, error: false, conflict: false },
      'saving',
    );
    expect(next).toEqual({ saving: true, saved: false, error: false, conflict: false });
  });

  it('maps saved status after server acknowledgement', () => {
    const next = reduceSharedPageSaveUi(INITIAL_SHARED_PAGE_SAVE_UI, 'saved');
    expect(next.saved).toBe(true);
    expect(next.saving).toBe(false);
  });

  it('keeps saved visible when autosave returns to idle', () => {
    const saved = reduceSharedPageSaveUi(INITIAL_SHARED_PAGE_SAVE_UI, 'saved');
    const idle = reduceSharedPageSaveUi(saved, 'idle');
    expect(idle.saved).toBe(true);
    expect(idle.saving).toBe(false);
  });

  it('maps failed status and clears saved', () => {
    const saved = reduceSharedPageSaveUi(INITIAL_SHARED_PAGE_SAVE_UI, 'saved');
    const failed = reduceSharedPageSaveUi(saved, 'failed');
    expect(failed).toEqual({ saving: false, saved: false, error: true, conflict: false });
  });

  it('maps conflict status separately from generic errors', () => {
    const next = reduceSharedPageSaveUi(INITIAL_SHARED_PAGE_SAVE_UI, 'conflict');
    expect(next).toEqual({ saving: false, saved: false, error: false, conflict: true });
  });

  it('uses a 7 second notice duration with sessionStorage and 10 seconds without', () => {
    expect(sharedNoticeVisibleDurationMs()).toBe(typeof sessionStorage === 'undefined' ? 10000 : 7000);
  });

  it('uses a 200ms notice fade duration', () => {
    expect(SHARED_NOTICE_FADE_MS).toBe(200);
  });

  it('builds a per-share notice storage key', () => {
    expect(sharedNoticeStorageKey('5Q25jl1374')).toBe('contentblocks:shared-notice:5Q25jl1374');
  });
});
