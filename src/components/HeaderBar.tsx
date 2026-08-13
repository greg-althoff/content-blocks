import type { Meta } from '../types';
import { cn } from '../lib/cn';
import { InlineEdit } from './InlineEdit';

interface HeaderBarProps {
  meta: Meta;
  onChange: (patch: Partial<Meta>) => void;
}

function Field({
  label,
  value,
  onChange,
  align = 'left',
  placeholder,
  maxLength,
  widthClass,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  align?: 'left' | 'center' | 'right';
  placeholder: string;
  maxLength: number;
  widthClass: string;
}) {
  return (
    <div
      className={cn(
        widthClass,
        align === 'right' && 'justify-self-end text-right',
        align === 'center' && 'justify-self-center text-center',
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-gray-400">{label}</div>
      <InlineEdit
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        align={align}
        maxLength={maxLength}
        className="mt-1 break-all text-[13px] text-gray-800"
      />
    </div>
  );
}

export function HeaderBar({ meta, onChange }: HeaderBarProps) {
  return (
    <header className="grid grid-cols-3 items-start gap-6">
      <Field
        label="Page"
        value={meta.page}
        placeholder="Page name"
        maxLength={28}
        widthClass="w-[28ch]"
        onChange={(page) => onChange({ page })}
      />
      <Field
        label="Client"
        value={meta.client}
        placeholder="Client name"
        maxLength={28}
        widthClass="w-[28ch]"
        onChange={(client) => onChange({ client })}
      />
      <Field
        label="Version"
        value={meta.version}
        placeholder="1.0"
        align="right"
        maxLength={16}
        widthClass="w-[16ch]"
        onChange={(version) => onChange({ version })}
      />
    </header>
  );
}
