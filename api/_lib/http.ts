import { createHash } from 'crypto';
import type { VercelRequest } from '@vercel/node';
import { getAllowedOrigins, getShareIpHashSalt } from './env.js';

export function jsonResponse(res: import('@vercel/node').VercelResponse, status: number, body: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).json(body);
}

export function readBodyBytes(raw: unknown): number {
  if (typeof raw === 'string') {
    return new TextEncoder().encode(raw).byteLength;
  }
  if (Buffer.isBuffer(raw)) {
    return raw.byteLength;
  }
  return new TextEncoder().encode(JSON.stringify(raw ?? '')).byteLength;
}

export function hashClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.socket?.remoteAddress ?? 'unknown';
  return createHash('sha256').update(`${getShareIpHashSalt()}:${ip}`).digest('hex');
}

export function isJsonRequest(req: VercelRequest): boolean {
  const contentType = req.headers['content-type'] ?? '';
  return contentType.toLowerCase().includes('application/json');
}

export function isAllowedRequestOrigin(req: VercelRequest): boolean {
  const allowedOrigins = getAllowedOrigins();
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : null;
  const host = typeof req.headers.host === 'string' ? req.headers.host : null;

  if (allowedOrigins.length > 0) {
    return Boolean(origin && allowedOrigins.includes(origin));
  }

  if (!host) return false;
  if (!origin) {
    // Non-browser clients have no Origin header; allow only when Referer matches host.
    const referer = typeof req.headers.referer === 'string' ? req.headers.referer : '';
    if (!referer) return false;
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function parseJsonBody(req: VercelRequest): { ok: true; body: unknown; bytes: number } | { ok: false; error: string } {
  const raw = req.body;
  const bytes = readBodyBytes(raw);

  if (bytes > 512 * 1024) {
    return { ok: false, error: 'Payload too large' };
  }

  if (raw == null || raw === '') {
    return { ok: false, error: 'Missing JSON body' };
  }

  if (typeof raw === 'object') {
    return { ok: true, body: raw, bytes };
  }

  if (typeof raw === 'string') {
    try {
      return { ok: true, body: JSON.parse(raw), bytes };
    } catch {
      return { ok: false, error: 'Invalid JSON' };
    }
  }

  return { ok: false, error: 'Invalid JSON body' };
}
