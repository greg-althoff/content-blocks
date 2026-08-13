import type { Meta } from '../types';
import { InlineEdit } from './InlineEdit';

interface FooterBarProps {
  meta: Meta;
  onChange: (patch: Partial<Meta>) => void;
}

export function FooterBar({ meta, onChange }: FooterBarProps) {
  return (
    <footer className="flex items-start justify-between gap-8">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-gray-400">
          Prepared by
        </div>
        <InlineEdit
          value={meta.preparedBy}
          onChange={(preparedBy) => onChange({ preparedBy })}
          placeholder="Your studio"
          className="mt-1 text-[13px] text-gray-800"
        />
      </div>
      <div className="text-right">
        <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-gray-400">
          Contact
        </div>
        <InlineEdit
          value={meta.contact}
          onChange={(contact) => onChange({ contact })}
          placeholder="email@studio.com"
          align="right"
          className="mt-1 text-[13px] text-gray-800"
        />
      </div>
    </footer>
  );
}
