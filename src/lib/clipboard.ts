function copyWithTextarea(text: string): boolean {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.setAttribute('aria-hidden', 'true');
  field.style.position = 'fixed';
  field.style.top = '0';
  field.style.left = '0';
  field.style.width = '1px';
  field.style.height = '1px';
  field.style.padding = '0';
  field.style.border = 'none';
  field.style.opacity = '0';
  document.body.appendChild(field);

  const selection = document.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  field.focus();
  field.select();
  field.setSelectionRange(0, text.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  document.body.removeChild(field);
  if (previous && selection) {
    selection.removeAllRanges();
    selection.addRange(previous);
  }
  return copied;
}

export async function copyTextFromAsync(produce: () => Promise<string>): Promise<boolean> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      const item = new ClipboardItem({
        'text/plain': produce().then((text) => new Blob([text], { type: 'text/plain' })),
      });
      await navigator.clipboard.write([item]);
      return true;
    } catch {
      // Safari often rejects writeText after await; ClipboardItem may still fail in older builds.
    }
  }

  const text = await produce();
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the older execCommand path.
  }

  return copyWithTextarea(text);
}
