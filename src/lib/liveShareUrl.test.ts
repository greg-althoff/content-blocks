import { describe, expect, it } from 'vitest';
import { createEmptyState } from '../defaultState';
import {
  hasShareableContent,
  liveSharePath,
  shouldAutoPromoteToLiveShare,
} from './liveShareUrl';
import type { AppState } from '../types';

const PAGE_WITH_BLOCK: AppState = {
  ...createEmptyState(),
  items: [{ id: 'block-1', type: 'content', label: 'Hello', ctas: [] }],
};

describe('liveShareUrl', () => {
  it('builds a stable /p/:id path', () => {
    expect(liveSharePath('5Q25jl1374')).toBe('/p/5Q25jl1374');
  });

  it('does not auto-promote an empty canvas', () => {
    expect(hasShareableContent(createEmptyState())).toBe(false);
    expect(shouldAutoPromoteToLiveShare(true, null, createEmptyState())).toBe(false);
  });

  it('auto-promotes a ready local page that has blocks', () => {
    expect(shouldAutoPromoteToLiveShare(true, null, PAGE_WITH_BLOCK)).toBe(true);
  });

  it('does not auto-promote when already on a live share URL', () => {
    expect(shouldAutoPromoteToLiveShare(true, '5Q25jl1374', PAGE_WITH_BLOCK)).toBe(false);
  });

  it('does not auto-promote a broken saved hash link', () => {
    expect(shouldAutoPromoteToLiveShare(true, null, PAGE_WITH_BLOCK, true)).toBe(false);
  });
});
