import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sanitizeState, validatePutBody } from '../../shared/validateState.js';
import { getShareAdminSecret } from '../_lib/env.js';
import { getDb } from '../_lib/db.js';
import { isValidShareId } from '../_lib/id.js';
import {
  hashClientIp,
  isAllowedRequestOrigin,
  isJsonRequest,
  jsonResponse,
  parseJsonBody,
} from '../_lib/http.js';
import { consumePutRateLimit } from '../_lib/putRateLimit.js';
import {
  isSharedPageReadable,
  loadSharedPage,
  revokeSharedPage,
  updateSharedPage,
} from '../_lib/sharedPageWrite.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!isValidShareId(id)) {
    return jsonResponse(res, 400, { error: 'Invalid share id' });
  }

  if (req.method === 'GET') {
    const { db } = getDb();
    const row = await loadSharedPage(db, id);

    if (!row) {
      return jsonResponse(res, 404, { error: 'Share not found' });
    }

    if (row.revokedAt) {
      return jsonResponse(res, 404, { error: 'Share not found' });
    }

    if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
      return jsonResponse(res, 410, { error: 'Share expired' });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(row.stateJson);
    } catch {
      return jsonResponse(res, 500, { error: 'Stored page is invalid' });
    }

    const state = sanitizeState(parsed);
    if (!state) {
      return jsonResponse(res, 500, { error: 'Stored page is invalid' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return jsonResponse(res, 200, {
      id: row.id,
      state,
      version: row.version,
      createdAt: row.createdAt?.getTime() ?? null,
      updatedAt: row.updatedAt?.getTime() ?? null,
      expiresAt: row.expiresAt?.getTime() ?? null,
    });
  }

  if (req.method === 'PUT') {
    if (!isJsonRequest(req)) {
      return jsonResponse(res, 415, { error: 'Content-Type must be application/json' });
    }

    if (!isAllowedRequestOrigin(req)) {
      return jsonResponse(res, 403, { error: 'Origin not allowed' });
    }

    const parsedBody = parseJsonBody(req);
    if (!parsedBody.ok) {
      return jsonResponse(res, 400, { error: parsedBody.error });
    }

    const putBody = validatePutBody(parsedBody.body, parsedBody.bytes);
    if (!putBody.ok) {
      return jsonResponse(res, putBody.status, { error: putBody.error });
    }

    const ipHash = hashClientIp(req);
    const putRateLimit = await consumePutRateLimit(id, ipHash);
    if (!putRateLimit.allowed) {
      res.setHeader('Retry-After', '60');
      return jsonResponse(res, 429, { error: 'Save rate limit exceeded' });
    }

    const { db } = getDb();
    const result = await updateSharedPage(db, {
      id,
      clientVersion: putBody.version,
      stateJson: putBody.stateJson,
      stateBytes: putBody.stateBytes,
    });

    if (!result.ok) {
      if (result.reason === 'not_found' || result.reason === 'revoked') {
        return jsonResponse(res, 404, { error: 'Share not found' });
      }
      if (result.reason === 'expired') {
        return jsonResponse(res, 410, { error: 'Share expired' });
      }
      return jsonResponse(res, 409, {
        error: 'Version conflict',
        currentVersion: result.currentVersion,
      });
    }

    res.setHeader('Cache-Control', 'no-store');
    return jsonResponse(res, 200, {
      id,
      version: result.version,
      updatedAt: result.updatedAt.getTime(),
    });
  }

  if (req.method === 'DELETE') {
    const auth = req.headers.authorization ?? '';
    const expected = `Bearer ${getShareAdminSecret()}`;
    if (auth !== expected) {
      return jsonResponse(res, 401, { error: 'Unauthorized' });
    }

    const { db } = getDb();
    const revoked = await revokeSharedPage(db, id);
    if (!revoked) {
      return jsonResponse(res, 404, { error: 'Share not found' });
    }

    return jsonResponse(res, 200, { ok: true });
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return jsonResponse(res, 405, { error: 'Method not allowed' });
}

export async function getSharedPageForRead(id: string) {
  const { db } = getDb();
  const row = await loadSharedPage(db, id);
  if (!row || !isSharedPageReadable(row)) return null;
  return row;
}
