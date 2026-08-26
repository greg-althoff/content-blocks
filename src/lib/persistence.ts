import { sanitizeState } from '../../shared/validateState';
import { SHARE_ID_PATTERN } from '../../shared/limits';
import { createEmptyState } from '../defaultState';
import type { AppState } from '../types';

export const STORAGE_KEY = 'content-blocks:v2';
export const NEW_PAGE_PARAM = 'new';
const HASH_PREFIX = 'cb1.';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function gzipEncode(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gzipDecode(bytes: Uint8Array): Promise<string> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

export { sanitizeState };

export async function encodeState(state: AppState): Promise<string> {
  const compressed = await gzipEncode(JSON.stringify(state));
  return HASH_PREFIX + bytesToBase64Url(compressed);
}

export async function decodeState(hash: string): Promise<AppState | null> {
  const raw = hash.replace(/^#/, '');
  if (!raw) return null;

  try {
    if (raw.startsWith(HASH_PREFIX)) {
      const bytes = base64UrlToBytes(raw.slice(HASH_PREFIX.length));
      const json = await gzipDecode(bytes);
      return sanitizeState(JSON.parse(json));
    }

    const padded = raw.replace(/-/g, '+').replace(/_/g, '/');
    return sanitizeState(JSON.parse(atob(padded)));
  } catch {
    return null;
  }
}

export type LocalSnapshot = {
  state: AppState;
  liveShareId: string | null;
};

function isAppStateShape(value: unknown): value is { meta: unknown; items: unknown } {
  return value !== null && typeof value === 'object' && 'meta' in value && 'items' in value;
}

export function loadLocalSnapshot(): LocalSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'state' in parsed && !('meta' in parsed)) {
      const envelope = parsed as { state: unknown; liveShareId?: unknown };
      const state = sanitizeState(envelope.state);
      if (!state) return null;
      const liveShareId =
        typeof envelope.liveShareId === 'string' && SHARE_ID_PATTERN.test(envelope.liveShareId)
          ? envelope.liveShareId
          : null;
      return { state, liveShareId };
    }
    if (!isAppStateShape(parsed)) return null;
    const state = sanitizeState(parsed);
    if (!state) return null;
    return { state, liveShareId: null };
  } catch {
    return null;
  }
}

export function loadLocalState(): AppState | null {
  return loadLocalSnapshot()?.state ?? null;
}

export function saveLocalState(state: AppState, liveShareId: string | null = null): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, liveShareId }));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function clearLocalState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore private-mode failures.
  }
}

export function getFallbackState(): AppState {
  return loadLocalState() ?? createEmptyState();
}

export function isNewPageRequest(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get(NEW_PAGE_PARAM) === '1';
}

/** Always open a blank app at the root. Never reuse `/p/:id` or other pathnames. */
export function newPageUrl(): string {
  return `${window.location.origin}/?${NEW_PAGE_PARAM}=1`;
}

export function stripNewPageParam(): void {
  const params = new URLSearchParams(window.location.search);
  if (params.get(NEW_PAGE_PARAM) !== '1') return;
  params.delete(NEW_PAGE_PARAM);
  const search = params.toString();
  history.replaceState(null, '', `/${search ? `?${search}` : ''}`);
}

export function looksLikePageStateHash(hash: string): boolean {
  const raw = hash.replace(/^#/, '');
  if (!raw) return false;
  return raw.startsWith(HASH_PREFIX) || raw.length > 40;
}
