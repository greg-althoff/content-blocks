import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isNewPageRequest,
  loadLocalSnapshot,
  looksLikePageStateHash,
  newPageUrl,
  saveLocalState,
  stripNewPageParam,
} from './persistence';

function mockWindowLocation(href: string) {
  const url = new URL(href);
  const location = {
    get href() {
      return url.href;
    },
    get origin() {
      return url.origin;
    },
    get pathname() {
      return url.pathname;
    },
    get search() {
      return url.search;
    },
    get hash() {
      return url.hash;
    },
  };
  const history = {
    replaceState: vi.fn((_state: unknown, _title: string, next: string) => {
      const updated = new URL(next, url.origin);
      url.href = updated.href;
    }),
  };

  vi.stubGlobal('window', { location, history });
  vi.stubGlobal('history', history);
  return { location, history };
}

describe('new page navigation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens a blank root page from a shared /p/:id URL instead of duplicating it', () => {
    mockWindowLocation('https://contentblocks.example/p/5Q25jl1374');
    expect(newPageUrl()).toBe('https://contentblocks.example/?new=1');
  });

  it('opens a blank root page from the home path', () => {
    mockWindowLocation('https://contentblocks.example/');
    expect(newPageUrl()).toBe('https://contentblocks.example/?new=1');
  });

  it('treats ?new=1 as a new page request even on a share path', () => {
    mockWindowLocation('https://contentblocks.example/p/5Q25jl1374?new=1');
    expect(isNewPageRequest()).toBe(true);
  });

  it('strips ?new=1 onto the app root instead of keeping the share path', () => {
    const { location, history } = mockWindowLocation(
      'https://contentblocks.example/p/5Q25jl1374?new=1',
    );
    stripNewPageParam();
    expect(history.replaceState).toHaveBeenCalledWith(null, '', '/');
    expect(location.pathname).toBe('/');
    expect(location.search).toBe('');
  });
});

describe('saved page persistence', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('recognizes truncated or encoded page hashes', () => {
    expect(looksLikePageStateHash('cb1.H4sIAAAA')).toBe(true);
    expect(looksLikePageStateHash('#cb1.abc')).toBe(true);
    expect(looksLikePageStateHash('short')).toBe(false);
  });

  it('stores the live share id beside local state so / resumes the same URL', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });

    saveLocalState(
      {
        meta: {
          page: 'Home',
          client: 'Client',
          version: '1.0',
          preparedBy: 'Studio',
          contact: 'a@b.c',
        },
        items: [{ id: 'block-1', type: 'content', label: 'Hello', ctas: [] }],
      },
      '5Q25jl1374',
    );

    expect(loadLocalSnapshot()).toEqual({
      liveShareId: '5Q25jl1374',
      state: {
        meta: {
          page: 'Home',
          client: 'Client',
          version: '1.0',
          preparedBy: 'Studio',
          contact: 'a@b.c',
        },
        items: [{ id: 'block-1', type: 'content', label: 'Hello', ctas: [] }],
      },
    });
  });
});
