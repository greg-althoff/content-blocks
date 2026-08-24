import {
  ALLOWED_META_KEYS,
  MAX_CTAS_PER_BLOCK,
  MAX_CTA_LENGTH,
  MAX_ITEM_ID_LENGTH,
  MAX_ITEMS,
  MAX_LABEL_LENGTH,
  MAX_LABEL_TAG_DEPTH,
  MAX_META_FIELD_LENGTH,
  MAX_PAYLOAD_BYTES,
} from './limits.js';
import { labelPlainText, labelTagDepth, sanitizeLabelHtml } from './sanitizeLabel.js';
import type { AppState, CanvasItem } from './types.js';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(obj: Record<string, unknown>, allowed: Set<string>): boolean {
  return Object.keys(obj).every((key) => allowed.has(key));
}

function readMetaString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? sanitizeLabelHtml(value).slice(0, MAX_META_FIELD_LENGTH) : fallback;
}

/** Lenient client-side normalization for hash links and localStorage. */
export function sanitizeState(raw: unknown): AppState | null {
  if (!isPlainObject(raw)) return null;
  if (!isPlainObject(raw.meta) || !Array.isArray(raw.items)) return null;

  const meta = raw.meta;
  const items: CanvasItem[] = [];

  for (const item of raw.items) {
    if (!isPlainObject(item) || typeof item.id !== 'string') continue;
    if (item.type === 'fold' || item.type === 'footer') {
      items.push({ id: item.id.slice(0, MAX_ITEM_ID_LENGTH), type: item.type });
      continue;
    }
    if (item.type === 'focus' || item.type === 'content') {
      const ctas = Array.isArray(item.ctas)
        ? item.ctas
            .filter((cta): cta is string => typeof cta === 'string')
            .slice(0, MAX_CTAS_PER_BLOCK)
            .map((cta) => sanitizeLabelHtml(cta).slice(0, MAX_CTA_LENGTH))
        : [];
      items.push({
        id: item.id.slice(0, MAX_ITEM_ID_LENGTH),
        type: item.type,
        label:
          typeof item.label === 'string'
            ? sanitizeLabelHtml(item.label).slice(0, MAX_LABEL_LENGTH)
            : 'Untitled',
        ctas,
      });
    }
  }

  return {
    meta: {
      page: readMetaString(meta.page, ''),
      client: readMetaString(meta.client, ''),
      version: readMetaString(meta.version, '1.0'),
      preparedBy: readMetaString(meta.preparedBy, ''),
      contact: readMetaString(meta.contact, ''),
    },
    items,
  };
}

export type ValidateShareStateResult =
  | { ok: true; state: AppState; stateJson: string; stateBytes: number }
  | { ok: false; error: string; status: number };

/**
 * Strict server-side validation before any database write.
 * Rejects malformed, unknown-field, or oversized payloads.
 */
export function validateShareState(rawBody: unknown, rawBodyBytes: number): ValidateShareStateResult {
  if (rawBodyBytes > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: 'Payload too large', status: 413 };
  }

  if (!isPlainObject(rawBody)) {
    return { ok: false, error: 'Invalid JSON body', status: 400 };
  }

  if (!hasOnlyKeys(rawBody, new Set(['state']))) {
    return { ok: false, error: 'Unexpected top-level fields', status: 400 };
  }

  const rawState = rawBody.state;
  if (!isPlainObject(rawState)) {
    return { ok: false, error: 'Missing state object', status: 400 };
  }

  if (!hasOnlyKeys(rawState, new Set(['meta', 'items']))) {
    return { ok: false, error: 'Unexpected state fields', status: 400 };
  }

  const meta = rawState.meta;
  const items = rawState.items;

  if (!isPlainObject(meta)) {
    return { ok: false, error: 'Invalid meta', status: 400 };
  }

  if (!hasOnlyKeys(meta, ALLOWED_META_KEYS)) {
    return { ok: false, error: 'Unexpected meta fields', status: 400 };
  }

  if (!Array.isArray(items)) {
    return { ok: false, error: 'Invalid items', status: 400 };
  }

  if (items.length > MAX_ITEMS) {
    return { ok: false, error: 'Too many items', status: 400 };
  }

  for (const [key, value] of Object.entries(meta)) {
    if (typeof value !== 'string') {
      return { ok: false, error: `Invalid meta field: ${key}`, status: 400 };
    }
    if (value.length > MAX_META_FIELD_LENGTH) {
      return { ok: false, error: `Meta field too long: ${key}`, status: 400 };
    }
    if (labelTagDepth(value) > MAX_LABEL_TAG_DEPTH) {
      return { ok: false, error: `Meta field nesting too deep: ${key}`, status: 400 };
    }
  }

  const blockItemKeys = new Set(['id', 'type', 'label', 'ctas']);
  const markerItemKeys = new Set(['id', 'type']);
  const seenIds = new Set<string>();

  for (const item of items) {
    if (!isPlainObject(item)) {
      return { ok: false, error: 'Invalid item', status: 400 };
    }

    if (typeof item.id !== 'string' || item.id.length === 0 || item.id.length > MAX_ITEM_ID_LENGTH) {
      return { ok: false, error: 'Invalid item id', status: 400 };
    }

    if (seenIds.has(item.id)) {
      return { ok: false, error: 'Duplicate item id', status: 400 };
    }
    seenIds.add(item.id);

    if (typeof item.type !== 'string') {
      return { ok: false, error: 'Invalid item type', status: 400 };
    }

    if (item.type === 'fold' || item.type === 'footer') {
      if (!hasOnlyKeys(item, markerItemKeys)) {
        return { ok: false, error: 'Unexpected marker fields', status: 400 };
      }
      continue;
    }

    if (item.type === 'focus' || item.type === 'content') {
      if (!hasOnlyKeys(item, blockItemKeys)) {
        return { ok: false, error: 'Unexpected block fields', status: 400 };
      }

      if (typeof item.label !== 'string') {
        return { ok: false, error: 'Invalid block label', status: 400 };
      }

      if (item.label.length > MAX_LABEL_LENGTH) {
        return { ok: false, error: 'Block label too long', status: 400 };
      }

      if (labelTagDepth(item.label) > MAX_LABEL_TAG_DEPTH) {
        return { ok: false, error: 'Block label nesting too deep', status: 400 };
      }

      if (!Array.isArray(item.ctas)) {
        return { ok: false, error: 'Invalid ctas', status: 400 };
      }

      if (item.ctas.length > MAX_CTAS_PER_BLOCK) {
        return { ok: false, error: 'Too many CTAs on a block', status: 400 };
      }

      for (const cta of item.ctas) {
        if (typeof cta !== 'string') {
          return { ok: false, error: 'Invalid CTA', status: 400 };
        }
        if (cta.length > MAX_CTA_LENGTH) {
          return { ok: false, error: 'CTA too long', status: 400 };
        }
        if (labelTagDepth(cta) > MAX_LABEL_TAG_DEPTH) {
          return { ok: false, error: 'CTA nesting too deep', status: 400 };
        }
      }

      continue;
    }

    return { ok: false, error: 'Unknown item type', status: 400 };
  }

  const sanitized = sanitizeState(rawState);
  if (!sanitized) {
    return { ok: false, error: 'State could not be sanitized', status: 400 };
  }

  const stateJson = JSON.stringify(sanitized);
  const stateBytes = new TextEncoder().encode(stateJson).byteLength;

  if (stateBytes > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: 'Sanitized state too large', status: 413 };
  }

  if (labelPlainText(sanitized.meta.page).length === 0 && sanitized.items.length === 0) {
    return { ok: false, error: 'Empty page cannot be shared', status: 400 };
  }

  return { ok: true, state: sanitized, stateJson, stateBytes };
}

export type ValidatePutBodyResult =
  | { ok: true; stateJson: string; stateBytes: number; version: number }
  | { ok: false; error: string; status: number };

export function validatePutBody(rawBody: unknown, rawBodyBytes: number): ValidatePutBodyResult {
  if (rawBodyBytes > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: 'Payload too large', status: 413 };
  }

  if (!isPlainObject(rawBody)) {
    return { ok: false, error: 'Invalid JSON body', status: 400 };
  }

  if (!hasOnlyKeys(rawBody, new Set(['state', 'version']))) {
    return { ok: false, error: 'Unexpected top-level fields', status: 400 };
  }

  const version = rawBody.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'Invalid version', status: 400 };
  }

  const validated = validateShareState({ state: rawBody.state }, rawBodyBytes);
  if (!validated.ok) {
    return validated;
  }

  return {
    ok: true,
    stateJson: validated.stateJson,
    stateBytes: validated.stateBytes,
    version,
  };
}
