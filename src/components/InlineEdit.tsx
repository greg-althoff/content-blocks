import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';

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
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    const next = maxLength != null ? trimmed.slice(0, maxLength) : trimmed;
    if (next && next !== value) onChange(next);
    else setDraft(value);
  };

  const alignClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        maxLength={maxLength}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') {
            setDraft(value);
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
