import type { SaveStatus } from '../lib/shareApi';

type SharedPageNoticeProps = {
  saveStatus: SaveStatus;
  onReload?: () => void;
};

const BASE_MESSAGE =
  'Shared live page — anyone with this link can edit. Changes save automatically.';

export function SharedPageNotice({ saveStatus, onReload }: SharedPageNoticeProps) {
  const isConflict = saveStatus === 'conflict';
  const tone = isConflict
    ? 'border-amber-300 bg-amber-50 text-amber-950'
    : 'border-sky-200 bg-sky-50 text-sky-950';

  let statusSuffix = '';
  if (saveStatus === 'saving') statusSuffix = ' Saving…';
  if (saveStatus === 'saved') statusSuffix = ' Saved';
  if (saveStatus === 'failed') statusSuffix = ' Save failed';

  return (
    <div className={`border-b px-4 py-2 text-center text-sm ${tone}`} role="status">
      {isConflict ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span>This page changed elsewhere—reload to get the latest version.</span>
          {onReload ? (
            <button
              type="button"
              onClick={onReload}
              className="rounded border border-amber-400 bg-white px-2 py-0.5 text-sm font-medium text-amber-950 hover:bg-amber-100"
            >
              Reload
            </button>
          ) : null}
        </div>
      ) : (
        <span>
          {BASE_MESSAGE}
          {statusSuffix}
        </span>
      )}
    </div>
  );
}
