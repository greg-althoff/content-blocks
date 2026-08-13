const ALLOWED = new Set(['B', 'STRONG', 'I', 'EM', 'BR']);

export function sanitizeLabelHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const el = node as HTMLElement;
    const inner = Array.from(el.childNodes).map(walk).join('');
    const tag = el.tagName;
    if (tag === 'BR') return '<br>';
    if (tag === 'B' || tag === 'STRONG') return inner ? `<b>${inner}</b>` : '';
    if (tag === 'I' || tag === 'EM') return inner ? `<i>${inner}</i>` : '';
    if (ALLOWED.has(tag)) return inner;
    return inner;
  };

  return Array.from(doc.body.childNodes).map(walk).join('').replace(/^(<br>)+|(<br>)+$/g, '');
}

export function labelPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\u00a0/g, ' ').trim();
}

export function isPristineEmpty(state: {
  items: unknown[];
  meta: { page: string; client: string; version: string; preparedBy: string; contact: string };
}): boolean {
  return (
    state.items.length === 0 &&
    state.meta.page === 'Untitled Page' &&
    state.meta.client === '' &&
    state.meta.version === '1.0' &&
    state.meta.preparedBy === '' &&
    state.meta.contact === ''
  );
}
