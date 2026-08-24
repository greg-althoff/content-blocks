import type { AppState } from '../../shared/types';
import { SHARE_ID_PATTERN } from '../../shared/limits';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed' | 'conflict';

const RETRY_DELAYS_MS = [1000, 2000, 4000];

export type SaveFn = (
  id: string,
  state: AppState,
  version: number,
) => Promise<{ version: number; updatedAt: number }>;

type LiveShareSaveManagerOptions = {
  shareId: string;
  getServerVersion: () => number;
  setServerVersion: (version: number) => void;
  onStatusChange: (status: SaveStatus) => void;
  saveFn?: SaveFn;
};

export class LiveShareSaveManager {
  private readonly shareId: string;
  private readonly getServerVersion: () => number;
  private readonly setServerVersion: (version: number) => void;
  private readonly onStatusChange: (status: SaveStatus) => void;
  private readonly saveFn: SaveFn;

  private enabled = false;
  private inFlight = false;
  private conflictMode = false;
  private pendingState: AppState | null = null;
  private saveGeneration = 0;
  private inFlightGeneration = 0;
  private debounceTimer: number | undefined;
  private retryTimer: number | undefined;
  private retryAttempt = 0;
  private lastSavedJson = '';
  private destroyed = false;

  constructor(options: LiveShareSaveManagerOptions) {
    this.shareId = options.shareId;
    this.getServerVersion = options.getServerVersion;
    this.setServerVersion = options.setServerVersion;
    this.onStatusChange = options.onStatusChange;
    this.saveFn = options.saveFn ?? updateShare;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearPendingWork();
    }
  }

  isEnabled(): boolean {
    return this.enabled && !this.destroyed;
  }

  markLoaded(state: AppState): void {
    this.lastSavedJson = JSON.stringify(state);
  }

  scheduleSave(state: AppState): void {
    if (!this.enabled || this.destroyed || this.conflictMode) return;

    this.saveGeneration += 1;
    window.clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      void this.enqueueSave(state);
    }, 800);
  }

  async flushSave(state: AppState): Promise<void> {
    if (!this.enabled || this.destroyed || this.conflictMode) return;
    window.clearTimeout(this.debounceTimer);
    this.pendingState = state;
    await this.flushPending();
  }

  isConflict(): boolean {
    return this.conflictMode;
  }

  destroy(): void {
    this.destroyed = true;
    this.enabled = false;
    this.clearPendingWork();
  }

  private clearPendingWork(): void {
    window.clearTimeout(this.debounceTimer);
    window.clearTimeout(this.retryTimer);
    this.debounceTimer = undefined;
    this.retryTimer = undefined;
    this.pendingState = null;
    this.inFlight = false;
    this.retryAttempt = 0;
  }

  private async enqueueSave(state: AppState): Promise<void> {
    if (!this.enabled || this.destroyed || this.conflictMode) return;

    const json = JSON.stringify(state);
    if (json === this.lastSavedJson && !this.pendingState) return;

    this.pendingState = state;
    await this.flushPending();
  }

  private async flushPending(): Promise<void> {
    if (!this.enabled || this.destroyed || this.conflictMode || this.inFlight) return;

    while (this.pendingState && !this.conflictMode && !this.destroyed && this.enabled) {
      const state = this.pendingState;
      this.pendingState = null;
      this.inFlight = true;
      this.inFlightGeneration = this.saveGeneration;
      this.onStatusChange('saving');

      try {
        const result = await this.saveFn(this.shareId, state, this.getServerVersion());
        this.setServerVersion(result.version);
        this.lastSavedJson = JSON.stringify(state);
        this.retryAttempt = 0;

        if (this.saveGeneration === this.inFlightGeneration && !this.pendingState) {
          this.onStatusChange('saved');
          window.setTimeout(() => {
            if (!this.destroyed && !this.inFlight && !this.pendingState && !this.conflictMode) {
              this.onStatusChange('idle');
            }
          }, 2000);
        } else {
          this.onStatusChange('idle');
        }
      } catch (error) {
        const status = error instanceof ShareSaveError ? error.status : 0;
        if (status === 409) {
          this.conflictMode = true;
          this.pendingState = null;
          this.onStatusChange('conflict');
          break;
        }

        if (status >= 400 && status < 500 && status !== 429) {
          this.onStatusChange('failed');
          break;
        }

        if (this.retryAttempt < RETRY_DELAYS_MS.length) {
          const delay = RETRY_DELAYS_MS[this.retryAttempt]!;
          this.retryAttempt += 1;
          this.pendingState = state;
          this.onStatusChange('failed');
          await new Promise<void>((resolve) => {
            this.retryTimer = window.setTimeout(() => resolve(), delay);
          });
        } else {
          this.onStatusChange('failed');
          break;
        }
      } finally {
        this.inFlight = false;
      }
    }
  }
}

export class ShareSaveError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function parseSharePath(pathname = window.location.pathname): string | null {
  const match = pathname.match(/^\/p\/([^/]+)\/?$/);
  const id = match?.[1] ?? null;
  return id && SHARE_ID_PATTERN.test(id) ? id : null;
}

export function buildSharePath(id: string): string {
  return `/p/${id}`;
}

export function toAbsoluteShareUrl(path: string): string {
  return new URL(path, window.location.origin).href;
}

export type SharedPagePayload = {
  state: AppState;
  version: number;
  updatedAt: number | null;
  createdAt: number | null;
};

type CreateShareResponse = {
  id: string;
  url: string;
  version: number;
  updatedAt: number;
};

export async function createShare(state: AppState): Promise<{
  id: string;
  url: string;
  absoluteUrl: string;
  version: number;
  updatedAt: number;
}> {
  const response = await fetch('/api/shares', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ state }),
  });

  if (!response.ok) {
    throw new ShareSaveError(response.status, `Share request failed (${response.status})`);
  }

  const payload = (await response.json()) as CreateShareResponse;
  const absoluteUrl = toAbsoluteShareUrl(payload.url);
  return {
    id: payload.id,
    url: payload.url,
    absoluteUrl,
    version: payload.version,
    updatedAt: payload.updatedAt,
  };
}

export async function fetchShare(id: string): Promise<SharedPagePayload> {
  const response = await fetch(`/api/shares/${encodeURIComponent(id)}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new ShareSaveError(response.status, `Share load failed (${response.status})`);
  }

  return (await response.json()) as SharedPagePayload;
}

export async function updateShare(
  id: string,
  state: AppState,
  version: number,
): Promise<{ version: number; updatedAt: number }> {
  const response = await fetch(`/api/shares/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ state, version }),
  });

  if (!response.ok) {
    throw new ShareSaveError(response.status, `Share save failed (${response.status})`);
  }

  const payload = (await response.json()) as { version: number; updatedAt: number };
  return payload;
}
