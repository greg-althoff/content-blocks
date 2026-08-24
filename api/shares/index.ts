import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateShareState } from '../../shared/validateState';
import { getDb } from '../_lib/db';
import { generateShareId } from '../_lib/id';
import {
  hashClientIp,
  isAllowedRequestOrigin,
  isJsonRequest,
  jsonResponse,
  parseJsonBody,
} from '../_lib/http';
import { consumeShareRateLimit } from '../_lib/rateLimit';
import { createSharedPage } from '../_lib/sharedPageWrite';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return jsonResponse(res, 405, { error: 'Method not allowed' });
  }

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

  const validated = validateShareState(parsedBody.body, parsedBody.bytes);
  if (!validated.ok) {
    return jsonResponse(res, validated.status, { error: validated.error });
  }

  const ipHash = hashClientIp(req);
  const rateLimit = await consumeShareRateLimit(ipHash);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', '3600');
    return jsonResponse(res, 429, { error: 'Rate limit exceeded' });
  }

  const { db } = getDb();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const id = generateShareId();
    try {
      const created = await createSharedPage(db, {
        id,
        stateJson: validated.stateJson,
        stateBytes: validated.stateBytes,
        creatorIpHash: ipHash,
      });

      res.setHeader('Cache-Control', 'no-store');
      return jsonResponse(res, 201, {
        id,
        url: `/p/${id}`,
        version: created.version,
        updatedAt: created.updatedAt.getTime(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes('unique') || message.toLowerCase().includes('constraint')) {
        continue;
      }
      throw error;
    }
  }

  return jsonResponse(res, 500, { error: 'Could not allocate share id' });
}
