import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { emDashFromHyphen } from '../lib/emDash';

interface InlineEditProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  align?: 'left' | 'center' | 'right';
  fullWidth?: boolean;
  maxLength?: number;
}

export function InlineEdit({
  value,
  onChange,
  className,
  inputClassName,
  placeholder = 'Untitled',
  align = 'left',
  fullWidth = true,
  maxLength,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const valueRef = useRef(value);
  const draftRef = useRef(draft);
  const editingRef = useRef(editing);
  const ignoreClickRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  valueRef.current = value;
  draftRef.current = draft;
  editingRef.current = editing;

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    if (!editingRef.current) return;
    editingRef.current = false;
    setEditing(false);
    ignoreClickRef.current = true;
    window.setTimeout(() => {
      ignoreClickRef.current = false;
    }, 0);

    const trimmed = draftRef.current.trim();
    const next = maxLength != null ? trimmed.slice(0, maxLength) : trimmed;
    if (next && next !== valueRef.current) onChange(next);
    else setDraft(valueRef.current);
  };

  const alignClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        maxLength={maxLength}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === '-' && !event.metaKey && !event.ctrlKey && !event.altKey) {
            const input = event.currentTarget;
            const start = input.selectionStart ?? 0;
            const end = input.selectionEnd ?? 0;
            const replaced = emDashFromHyphen(draftRef.current, start, end);
            if (replaced) {
              event.preventDefault();
              const next =
                maxLength != null ? replaced.value.slice(0, maxLength) : replaced.value;
              setDraft(next);
              requestAnimationFrame(() => {
                const pos = Math.min(replaced.caret, next.length);
                input.setSelectionRange(pos, pos);
              });
              return;
            }
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === 'Escape') {
            setDraft(valueRef.current);
            editingRef.current = false;
            setEditing(false);
          }
        }}
        placeholder={placeholder}
        className={cn(
          'min-w-0 bg-transparent outline-none border-b border-accent/70',
          fullWidth ? 'w-full' : 'w-auto',
          alignClass,
          className,
          inputClassName,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (ignoreClickRef.current) return;
        setEditing(true);
      }}
      className={cn(
        'block min-w-0 cursor-text rounded-sm hover:bg-black/[0.03]',
        fullWidth ? 'w-full' : 'w-auto',
        alignClass,
        !value && 'text-gray-400',
        className,
      )}
    >
      {value ? value : placeholder}
    </button>
  );
}
