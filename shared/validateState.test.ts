import { describe, expect, it } from 'vitest';
import { createEmptyState } from '../src/defaultState';
import { validateShareState } from './validateState';

const PAGE_WITH_BLOCK = {
  meta: {
    page: 'Untitled Page',
    client: '',
    version: '1.0',
    preparedBy: '',
    contact: '',
  },
  items: [{ id: 'block-1', type: 'content', label: 'Hello', ctas: [] }],
};

describe('validateShareState', () => {
  it('rejects a titled page with no content blocks so empty canvases cannot overwrite a saved URL', () => {
    const empty = createEmptyState();
    const body = { state: empty };
    const result = validateShareState(body, JSON.stringify(body).length);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Empty page cannot be shared');
      expect(result.status).toBe(400);
    }
  });

  it('accepts a page that has at least one block', () => {
    const body = { state: PAGE_WITH_BLOCK };
    const result = validateShareState(body, JSON.stringify(body).length);
    expect(result.ok).toBe(true);
  });
});
