import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function iconProps(props: IconProps): IconProps {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...props,
  };
}

export function FocusPointIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="8" strokeDasharray="2.5 2.2" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ContentBlockIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5 7h14M5 12h14M5 17h9" />
    </svg>
  );
}

export function CallToActionIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3.5" y="4.5" width="13" height="9.5" rx="1.6" strokeDasharray="2.4 2" />
      <path
        d="M13.2 12.8 14.1 20l2.1-2.1 2.2 2.6 1.5-1.3-2.2-2.5 2.6-1.1z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function FoldIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 12h16" strokeDasharray="2.6 2.2" />
      <path d="M4 9.5v5M20 9.5v5" />
    </svg>
  );
}

export function FooterIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 10h16" strokeDasharray="2.6 2.2" />
      <path d="M4 16h16" strokeWidth="2" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="18" cy="5" r="2.4" />
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="18" cy="19" r="2.4" />
      <path d="M8.2 13.1 15.8 17.4M15.8 6.6 8.2 10.9" />
    </svg>
  );
}

export function ExportIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 4v10" />
      <path d="M8 8l4-4 4 4" />
      <path d="M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16" />
    </svg>
  );
}

export function DragHandle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 16" className={className} aria-hidden>
      {[0, 1, 2].flatMap((row) =>
        [0, 1].map((col) => (
          <circle
            key={`${row}-${col}`}
            cx={2.2 + col * 5.6}
            cy={2.2 + row * 5.8}
            r="1.35"
            fill="currentColor"
          />
        )),
      )}
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <rect x="9" y="1.5" width="17" height="17" rx="3.2" fill="#93C5FD" />
      <rect x="5" y="6.5" width="17" height="17" rx="3.2" fill="#60A5FA" />
      <rect x="1" y="11.5" width="17" height="17" rx="3.2" fill="#3B82F6" />
    </svg>
  );
}
