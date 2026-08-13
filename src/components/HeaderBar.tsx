import type { Meta } from '../types';
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  align?: 'left' | 'center' | 'right';
  placeholder: string;
}) {
  return (
    <div className={align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''}>
      <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-gray-400">{label}</div>
      <InlineEdit
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        align={align}
        className="mt-1 text-[13px] text-gray-800"
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
        onChange={(page) => onChange({ page })}
      />
      <Field
        label="Client"
        value={meta.client}
        placeholder="Client name"
        onChange={(client) => onChange({ client })}
      />
      <Field
        label="Version"
        value={meta.version}
        placeholder="1.0"
        align="right"
        onChange={(version) => onChange({ version })}
      />
    </header>
  );
}
