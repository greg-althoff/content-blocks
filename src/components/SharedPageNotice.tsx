import { useEffect, useRef, useState } from 'react';
import {
  markSharedNoticeDismissed,
  sharedNoticeVisibleDurationMs,
  SHARED_NOTICE_FADE_MS,
  wasSharedNoticeDismissed,
} from '../lib/sharedPageSaveUi';

const NOTICE_COPY = 'Live shared page · Edits save automatically';

type SharedPageNoticeProps = {
  shareId: string;
};

export function SharedPageNotice({ shareId }: SharedPageNoticeProps) {
  const [visible, setVisible] = useState(() => !wasSharedNoticeDismissed(shareId));
  const [fading, setFading] = useState(false);
  const [mounted, setMounted] = useState(visible);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (!visible || dismissedRef.current) return;

    const fadeTimer = window.setTimeout(() => {
      setFading(true);
    }, sharedNoticeVisibleDurationMs());

    return () => {
      window.clearTimeout(fadeTimer);
    };
  }, [visible, shareId]);

  useEffect(() => {
    if (!fading) return;

    const removeTimer = window.setTimeout(() => {
      dismissedRef.current = true;
      markSharedNoticeDismissed(shareId);
      setVisible(false);
      setMounted(false);
    }, SHARED_NOTICE_FADE_MS);

    return () => {
      window.clearTimeout(removeTimer);
    };
  }, [fading, shareId]);

  if (!mounted) return null;

  return (
    <div
      className={`overflow-hidden border-b border-slate-200/80 bg-[#FAFAF8] px-4 py-2 text-center text-sm text-slate-700 transition-opacity duration-200 motion-reduce:transition-none ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
    >
      {NOTICE_COPY}
    </div>
  );
}
