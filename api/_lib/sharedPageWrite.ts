import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema.js';
import { sharedPages } from './schema.js';

export type SharedPageDb = LibSQLDatabase<typeof schema>;

export type SharedPageRow = {
  id: string;
  stateJson: string;
  stateBytes: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  version: number;
  expiresAt: Date | null;
  revokedAt: Date | null;
  creatorIpHash: string | null;
};

export type CreateSharedPageInput = {
  id: string;
  stateJson: string;
  stateBytes: number;
  creatorIpHash: string;
};

export type UpdateSharedPageInput = {
  id: string;
  clientVersion: number;
  stateJson: string;
  stateBytes: number;
};

export type UpdateSharedPageResult =
  | { ok: true; version: number; updatedAt: Date }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'revoked' }
  | { ok: false; reason: 'expired' }
  | { ok: false; reason: 'version_conflict'; currentVersion: number };

export async function createSharedPage(db: SharedPageDb, input: CreateSharedPageInput) {
  const now = new Date();
  await db.insert(sharedPages).values({
    id: input.id,
    stateJson: input.stateJson,
    stateBytes: input.stateBytes,
    createdAt: now,
    updatedAt: now,
    version: 1,
    expiresAt: null,
    revokedAt: null,
    creatorIpHash: input.creatorIpHash,
  });

  return { version: 1, updatedAt: now };
}

export async function loadSharedPage(db: SharedPageDb, id: string): Promise<SharedPageRow | null> {
  const rows = await db.select().from(sharedPages).where(eq(sharedPages.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function updateSharedPage(
  db: SharedPageDb,
  input: UpdateSharedPageInput,
): Promise<UpdateSharedPageResult> {
  const now = new Date();
  const existing = await loadSharedPage(db, input.id);

  if (!existing) {
    return { ok: false, reason: 'not_found' };
  }

  if (existing.revokedAt) {
    return { ok: false, reason: 'revoked' };
  }

  if (existing.expiresAt && existing.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: 'expired' };
  }

  const updated = await db
    .update(sharedPages)
    .set({
      stateJson: input.stateJson,
      stateBytes: input.stateBytes,
      updatedAt: now,
      version: sql`${sharedPages.version} + 1`,
    })
    .where(
      and(
        eq(sharedPages.id, input.id),
        eq(sharedPages.version, input.clientVersion),
        isNull(sharedPages.revokedAt),
        or(isNull(sharedPages.expiresAt), gt(sharedPages.expiresAt, now)),
      ),
    )
    .returning({
      version: sharedPages.version,
      updatedAt: sharedPages.updatedAt,
    });

  const row = updated[0];
  if (!row?.updatedAt) {
    const current = await loadSharedPage(db, input.id);
    if (!current) return { ok: false, reason: 'not_found' };
    if (current.revokedAt) return { ok: false, reason: 'revoked' };
    if (current.expiresAt && current.expiresAt.getTime() <= now.getTime()) {
      return { ok: false, reason: 'expired' };
    }
    return { ok: false, reason: 'version_conflict', currentVersion: current.version };
  }

  return { ok: true, version: row.version, updatedAt: row.updatedAt };
}

export async function revokeSharedPage(db: SharedPageDb, id: string): Promise<boolean> {
  const rows = await db
    .select({ id: sharedPages.id })
    .from(sharedPages)
    .where(and(eq(sharedPages.id, id), isNull(sharedPages.revokedAt)))
    .limit(1);

  if (!rows[0]) return false;

  await db.update(sharedPages).set({ revokedAt: new Date() }).where(eq(sharedPages.id, id));
  return true;
}

export function isSharedPageReadable(row: SharedPageRow, now = new Date()): boolean {
  if (row.revokedAt) return false;
  if (row.expiresAt && row.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}
