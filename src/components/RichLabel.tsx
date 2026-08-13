import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { insertEmDashInContentEditable, replaceDoubleHyphensInEditor } from '../lib/emDash';
import { labelPlainText, sanitizeLabelHtml } from '../lib/richText';

interface RichLabelProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface ToolbarState {
  top: number;
  left: number;
  bold: boolean;
  italic: boolean;
}

export function RichLabel({ value, onChange, placeholder = 'Untitled', className }: RichLabelProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(value);
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);

  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (value !== lastEmitted.current || el.innerHTML !== value) {
      el.innerHTML = value;
      lastEmitted.current = value;
    }
  }, [value]);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    replaceDoubleHyphensInEditor(el);
    const html = sanitizeLabelHtml(el.innerHTML);
    if (!labelPlainText(html) && html !== '') {
      el.innerHTML = '';
      lastEmitted.current = '';
      onChange('');
      return;
    }
    lastEmitted.current = html;
    onChange(html);
  }, [onChange]);

  const updateToolbar = useCallback(() => {
    const el = editorRef.current;
    const selection = window.getSelection();
    if (!el || !selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setToolbar(null);
      return;
    }
    if (!el.contains(selection.anchorNode) || !el.contains(selection.focusNode)) {
      setToolbar(null);
      return;
    }
    if (selection.toString().replace(/\s/g, '').length < 2) {
      setToolbar(null);
      return;
    }
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    setToolbar({
      top: Math.max(8, rect.top - 44),
      left: rect.left + rect.width / 2,
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
    });
  }, []);

  useEffect(() => {
    const onSelectionChange = () => updateToolbar();
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [updateToolbar]);

  const apply = (command: 'bold' | 'italic' | 'removeFormat') => {
    editorRef.current?.focus();
    document.execCommand(command);
    emit();
    requestAnimationFrame(updateToolbar);
  };

  return (
    <>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={placeholder}
        data-placeholder={placeholder}
        className={cn(
          'rich-label min-w-0 cursor-text outline-none',
          className,
        )}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onInput={emit}
        onBeforeInput={(event) => {
          const native = event.nativeEvent as InputEvent;
          if (native.inputType !== 'insertText' || native.data !== '-') return;
          const el = editorRef.current;
          if (!el) return;
          if (insertEmDashInContentEditable(el)) {
            event.preventDefault();
            emit();
          }
        }}
        onBlur={() => {
          emit();
          setToolbar(null);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            (event.target as HTMLElement).blur();
          }
        }}
      />
      {toolbar &&
        createPortal(
          <div
            className="fixed z-[80] flex -translate-x-1/2 items-center rounded-full bg-black px-1 py-1 shadow-[0_6px_20px_rgba(0,0,0,0.45)]"
            style={{ top: toolbar.top, left: toolbar.left }}
            onMouseDown={(event) => event.preventDefault()}
          >
            <button
              type="button"
              aria-label="Bold"
              aria-pressed={toolbar.bold}
              onClick={() => apply('bold')}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md text-[13px] font-bold text-white',
                toolbar.bold ? 'bg-neutral-700' : 'hover:bg-white/10',
              )}
            >
              B
            </button>
            <span className="mx-0.5 h-4 w-px shrink-0 bg-neutral-700" aria-hidden />
            <button
              type="button"
              aria-label="Italic"
              aria-pressed={toolbar.italic}
              onClick={() => apply('italic')}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md font-serif text-[13px] italic text-white',
                toolbar.italic ? 'bg-neutral-700' : 'hover:bg-white/10',
              )}
            >
              I
            </button>
            <span className="mx-0.5 h-4 w-px shrink-0 bg-neutral-700" aria-hidden />
            <button
              type="button"
              aria-label="Clear formatting"
              onClick={() => apply('removeFormat')}
              className="flex h-7 items-center rounded-md px-2.5 font-mono text-[12px] lowercase tracking-normal text-white hover:bg-white/10"
            >
              clear
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
