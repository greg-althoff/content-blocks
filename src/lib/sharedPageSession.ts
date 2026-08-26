import type { AppState } from '../../shared/types';

export type SharedPageLoadPhase = 'idle' | 'loading' | 'hydrated' | 'error';

export type SharedPageSessionSnapshot = {
  phase: SharedPageLoadPhase;
  editGeneration: number;
  hydrationBaseline: number;
};

/** Gating logic for live shared-page load, hydration, and autosave eligibility. */
export class SharedPageSession {
  private phase: SharedPageLoadPhase = 'idle';
  private editGeneration = 0;
  private hydrationBaseline = 0;

  reset(): void {
    this.phase = 'idle';
    this.editGeneration = 0;
    this.hydrationBaseline = 0;
  }

  beginLoad(): void {
    this.phase = 'loading';
    this.editGeneration = 0;
    this.hydrationBaseline = 0;
  }

  completeHydration(): void {
    this.phase = 'hydrated';
    this.hydrationBaseline = this.editGeneration;
  }

  failLoad(): void {
    this.phase = 'error';
  }

  recordUserEdit(): void {
    this.editGeneration += 1;
  }

  isLoadingSharedPage(): boolean {
    return this.phase === 'loading';
  }

  hasLoadError(): boolean {
    return this.phase === 'error';
  }

  isHydrated(): boolean {
    return this.phase === 'hydrated';
  }

  canAutosave(): boolean {
    return this.phase === 'hydrated' && this.editGeneration > this.hydrationBaseline;
  }

  canSharePut(): boolean {
    return this.phase === 'hydrated';
  }

  snapshot(): SharedPageSessionSnapshot {
    return {
      phase: this.phase,
      editGeneration: this.editGeneration,
      hydrationBaseline: this.hydrationBaseline,
    };
  }
}

export function shouldScheduleSharedPageAutosave(
  session: SharedPageSessionSnapshot,
  state?: { items: unknown[] },
): boolean {
  if (session.phase !== 'hydrated' || session.editGeneration <= session.hydrationBaseline) {
    return false;
  }
  if (state && state.items.length === 0) return false;
  return true;
}

export function isLoadingSharedPagePhase(phase: SharedPageLoadPhase): boolean {
  return phase === 'loading';
}

/** Apply remote state without counting as a user edit. */
export function hydrateSharedPageState(
  session: SharedPageSession,
  remoteState: AppState,
): AppState {
  session.completeHydration();
  return remoteState;
}
