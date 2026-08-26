import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { createEmptyState } from '../defaultState';
import { LiveShareSaveManager } from './shareApi';
import { SharedPageSession, shouldScheduleSharedPageAutosave } from './sharedPageSession';
import type { AppState } from '../../shared/types';

const REMOTE_STATE: AppState = {
  meta: {
    page: 'Remote Page',
    client: 'Client',
    version: '1.0',
    preparedBy: 'Studio',
    contact: 'test@example.com',
  },
  items: [
    {
      id: 'block-1',
      type: 'content',
      label: 'Saved block',
      ctas: [],
    },
  ],
};

describe('SharedPageSession', () => {
  it('blocks autosave while loading and immediately after hydration', () => {
    const session = new SharedPageSession();
    session.beginLoad();
    expect(session.canAutosave()).toBe(false);
    expect(shouldScheduleSharedPageAutosave(session.snapshot())).toBe(false);

    session.completeHydration();
    expect(session.canAutosave()).toBe(false);
    expect(shouldScheduleSharedPageAutosave(session.snapshot())).toBe(false);
  });

  it('blocks autosave of an empty canvas even after a user edit', () => {
    const session = new SharedPageSession();
    session.beginLoad();
    session.completeHydration();
    session.recordUserEdit();
    expect(shouldScheduleSharedPageAutosave(session.snapshot(), createEmptyState())).toBe(false);
  });

  it('allows autosave only after a user edit post-hydration', () => {
    const session = new SharedPageSession();
    session.beginLoad();
    session.completeHydration();
    session.recordUserEdit();
    expect(session.canAutosave()).toBe(true);
    expect(shouldScheduleSharedPageAutosave(session.snapshot(), REMOTE_STATE)).toBe(true);
  });

  it('never allows autosave after load failure', () => {
    const session = new SharedPageSession();
    session.beginLoad();
    session.failLoad();
    session.recordUserEdit();
    expect(session.canAutosave()).toBe(false);
  });
});

describe('live share hydration race', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
      clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sends no PUT before GET resolves while loading', async () => {
    const saveFn = vi.fn().mockResolvedValue({ version: 2, updatedAt: Date.now() });
    const session = new SharedPageSession();
    session.beginLoad();

    const manager = new LiveShareSaveManager({
      shareId: 'abc1234567',
      getServerVersion: () => 1,
      setServerVersion: () => {},
      onStatusChange: () => {},
      saveFn,
    });
    manager.setEnabled(false);
    manager.scheduleSave(createEmptyState());

    await vi.runAllTimersAsync();
    expect(saveFn).not.toHaveBeenCalled();
    manager.destroy();
  });

  it('sends no PUT when hydrating remote state', async () => {
    const saveFn = vi.fn().mockResolvedValue({ version: 2, updatedAt: Date.now() });
    const session = new SharedPageSession();
    session.beginLoad();

    const manager = new LiveShareSaveManager({
      shareId: 'abc1234567',
      getServerVersion: () => 1,
      setServerVersion: () => {},
      onStatusChange: () => {},
      saveFn,
    });

    session.completeHydration();
    manager.markLoaded(REMOTE_STATE);
    manager.setEnabled(true);
    manager.scheduleSave(REMOTE_STATE);

    await vi.runAllTimersAsync();
    expect(saveFn).not.toHaveBeenCalled();
    manager.destroy();
  });

  it('never PUTs after a failed GET', async () => {
    const saveFn = vi.fn().mockResolvedValue({ version: 2, updatedAt: Date.now() });
    const session = new SharedPageSession();
    session.beginLoad();
    session.failLoad();

    const manager = new LiveShareSaveManager({
      shareId: 'abc1234567',
      getServerVersion: () => 1,
      setServerVersion: () => {},
      onStatusChange: () => {},
      saveFn,
    });
    manager.setEnabled(false);
    session.recordUserEdit();
    manager.scheduleSave(createEmptyState());

    await vi.runAllTimersAsync();
    expect(saveFn).not.toHaveBeenCalled();
    manager.destroy();
  });

  it('PUTs only after a user-originated edit post-hydration', async () => {
    const saveFn = vi.fn().mockResolvedValue({ version: 2, updatedAt: Date.now() });
    const session = new SharedPageSession();
    session.beginLoad();
    session.completeHydration();

    const manager = new LiveShareSaveManager({
      shareId: 'abc1234567',
      getServerVersion: () => 1,
      setServerVersion: () => {},
      onStatusChange: () => {},
      saveFn,
    });
    manager.markLoaded(REMOTE_STATE);
    manager.setEnabled(true);

    session.recordUserEdit();
    const edited: AppState = {
      ...REMOTE_STATE,
      meta: { ...REMOTE_STATE.meta, page: 'Edited Page' },
    };
    manager.scheduleSave(edited);

    await vi.advanceTimersByTimeAsync(800);
    expect(saveFn).toHaveBeenCalledTimes(1);
    expect(saveFn).toHaveBeenCalledWith('abc1234567', edited, 1, { keepalive: false });
    manager.destroy();
  });
});
