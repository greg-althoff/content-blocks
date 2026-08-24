type SharedPageSavePillProps = {
  saving: boolean;
  saved: boolean;
  error: boolean;
  conflict: boolean;
  onRetry: () => void;
  onReload: () => void;
};

function SpinnerIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-accent" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-amber-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 00-.75.75v3.5a.75.75 0 001.5 0v-3.5A.75.75 0 0010 6zm0 8a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function SharedPageSavePill({
  saving,
  saved,
  error,
  conflict,
  onRetry,
  onReload,
}: SharedPageSavePillProps) {
  const show = saving || saved || error || conflict;
  if (!show) return null;

  let statusLabel = '';
  if (saving) statusLabel = 'Saving…';
  else if (saved) statusLabel = 'Saved';
  else if (error) statusLabel = "Couldn't save";
  else if (conflict) statusLabel = 'Page changed elsewhere';

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-slate-200/90 bg-[#FAFAF8]/95 px-3 py-1.5 text-sm text-slate-800 shadow-sm backdrop-blur-sm transition-all duration-200 motion-reduce:transition-none">
        {saving ? <SpinnerIcon /> : null}
        {saved && !saving ? <CheckIcon /> : null}
        {error ? <WarningIcon /> : null}
        {conflict ? <WarningIcon /> : null}
        <span>{statusLabel}</span>
        {error ? (
          <button
            type="button"
            onClick={onRetry}
            className="ml-0.5 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-accent transition-colors duration-150 hover:border-accent/40 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Retry saving shared page"
          >
            Retry
          </button>
        ) : null}
        {conflict ? (
          <button
            type="button"
            onClick={onReload}
            className="ml-0.5 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-accent transition-colors duration-150 hover:border-accent/40 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Reload shared page to get the latest version"
          >
            Reload
          </button>
        ) : null}
      </div>
    </div>
  );
}
