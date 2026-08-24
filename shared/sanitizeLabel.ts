const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'br']);

/** Strip/sanitize label HTML without DOM APIs (safe for Node and browsers). */
export function sanitizeLabelHtml(html: string): string {
  if (!html) return '';

  let out = '';
  let i = 0;

  const appendText = (text: string) => {
    out += text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  while (i < html.length) {
    if (html[i] === '<') {
      const close = html.indexOf('>', i);
      if (close === -1) {
        appendText(html.slice(i));
        break;
      }

      const tagContent = html.slice(i + 1, close).trim();
      i = close + 1;

      if (!tagContent) continue;

      const isClosing = tagContent.startsWith('/');
      const rawName = (isClosing ? tagContent.slice(1) : tagContent).split(/\s/)[0]?.toLowerCase() ?? '';
      const name = rawName.replace(/[^a-z0-9]/g, '');

      if (name === 'br' && !isClosing) {
        out += '<br>';
        continue;
      }

      if (!ALLOWED_TAGS.has(name) || name === 'br') continue;

      if (isClosing) {
        out += `</${name === 'strong' ? 'b' : name === 'em' ? 'i' : name}>`;
      } else {
        out += `<${name === 'strong' ? 'b' : name === 'em' ? 'i' : name}>`;
      }
      continue;
    }

    const nextTag = html.indexOf('<', i);
    if (nextTag === -1) {
      appendText(html.slice(i));
      break;
    }
    appendText(html.slice(i, nextTag));
    i = nextTag;
  }

  return out.replace(/^(<br>)+|(<br>)+$/g, '');
}

export function labelPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\u00a0/g, ' ')
    .trim();
}

export function labelTagDepth(html: string): number {
  let depth = 0;
  let max = 0;
  const tagRe = /<\/?([a-z0-9]+)[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(html)) !== null) {
    const name = match[1]?.toLowerCase() ?? '';
    if (!ALLOWED_TAGS.has(name) || name === 'br') continue;
    if (match[0].startsWith('</')) {
      depth = Math.max(0, depth - 1);
    } else {
      depth += 1;
      max = Math.max(max, depth);
    }
  }

  return max;
}
