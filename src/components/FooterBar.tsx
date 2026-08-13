import type { Meta } from '../types';
import { InlineEdit } from './InlineEdit';

interface FooterBarProps {
  meta: Meta;
  onChange: (patch: Partial<Meta>) => void;
}

export function FooterBar({ meta, onChange }: FooterBarProps) {
  return (
    <footer className="flex items-start justify-between gap-8">
      <div className="w-[28ch]">
        <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-gray-400">
          Prepared by
        </div>
        <InlineEdit
          value={meta.preparedBy}
          onChange={(preparedBy) => onChange({ preparedBy })}
          placeholder="Your studio"
          maxLength={28}
          className="mt-1 break-all text-[13px] text-gray-800"
        />
      </div>
      <div className="w-[28ch] text-right">
        <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-gray-400">
          Contact
        </div>
        <InlineEdit
          value={meta.contact}
          onChange={(contact) => onChange({ contact })}
          placeholder="email@studio.com"
          align="right"
          maxLength={28}
          className="mt-1 break-all text-[13px] text-gray-800"
        />
      </div>
    </footer>
  );
}
