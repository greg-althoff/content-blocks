const EM_DASH = '—';

/** If typing '-' would complete '--', return the string and caret after an em dash. */
export function emDashFromHyphen(
  value: string,
  caretStart: number,
  caretEnd: number,
): { value: string; caret: number } | null {
  if (caretStart !== caretEnd || caretStart === 0) return null;
  if (value[caretStart - 1] !== '-') return null;
  return {
    value: value.slice(0, caretStart - 1) + EM_DASH + value.slice(caretEnd),
    caret: caretStart,
  };
}

function textBeforeCaret(editor: HTMLElement): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return '';
  if (!editor.contains(selection.anchorNode)) return '';
  const caret = selection.getRangeAt(0);
  const prefix = document.createRange();
  prefix.selectNodeContents(editor);
  prefix.setEnd(caret.startContainer, caret.startOffset);
  return prefix.toString();
}

export function insertEmDashInContentEditable(editor: HTMLElement): boolean {
  if (!textBeforeCaret(editor).endsWith('-')) return false;
  document.execCommand('delete');
  document.execCommand('insertText', false, EM_DASH);
  return true;
}

export function replaceDoubleHyphensInEditor(editor: HTMLElement): boolean {
  const selection = window.getSelection();
  const anchor = selection?.anchorNode;
  const anchorOffset = selection?.anchorOffset ?? 0;
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let changed = false;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? '';
    if (!text.includes('--')) continue;
    const next = text.replace(/--/g, EM_DASH);
    const isAnchor = node === anchor;
    node.textContent = next;
    changed = true;
    if (isAnchor && selection) {
      const newOffset = text.slice(0, anchorOffset).replace(/--/g, EM_DASH).length;
      const range = document.createRange();
      range.setStart(node, Math.min(newOffset, next.length));
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  return changed;
}
