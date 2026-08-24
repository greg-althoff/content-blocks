import { sanitizeState } from '../../shared/validateState';
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

export function loadLocalState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return sanitizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

export function newPageUrl(): string {
  return `${window.location.origin}${window.location.pathname}?${NEW_PAGE_PARAM}=1`;
}

export function stripNewPageParam(): void {
  const params = new URLSearchParams(window.location.search);
  if (params.get(NEW_PAGE_PARAM) !== '1') return;
  params.delete(NEW_PAGE_PARAM);
  const search = params.toString();
  history.replaceState(null, '', window.location.pathname + (search ? `?${search}` : ''));
}
