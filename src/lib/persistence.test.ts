import { afterEach, describe, expect, it, vi } from 'vitest';
import { isNewPageRequest, newPageUrl, stripNewPageParam } from './persistence';

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
