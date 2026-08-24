import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { describe, expect, it, beforeEach } from 'vitest';
import * as schema from './schema';
import {
  createSharedPage,
  loadSharedPage,
  updateSharedPage,
  type SharedPageDb,
} from './sharedPageWrite';

const SAMPLE_STATE = {
  meta: {
    page: 'Test Page',
    client: 'Client',
    version: '1.0',
    preparedBy: 'Studio',
    contact: 'test@example.com',
  },
  items: [
    {
      id: 'block-1',
      type: 'content',
      label: 'Hello',
      ctas: [],
    },
  ],
};

async function createTestDb(): Promise<SharedPageDb> {
  const client = createClient({ url: ':memory:' });
  await client.execute(`
    CREATE TABLE shared_pages (
      id text PRIMARY KEY NOT NULL,
      state_json text NOT NULL,
      state_bytes integer NOT NULL,
      created_at integer NOT NULL,
      updated_at integer NOT NULL DEFAULT 0,
      version integer NOT NULL DEFAULT 1,
      expires_at integer,
      revoked_at integer,
      creator_ip_hash text
    )
  `);
  return drizzle(client, { schema });
}

describe('sharedPageWrite', () => {
  let db: SharedPageDb;

  beforeEach(async () => {
    db = await createTestDb();
  });

  it('creates a page with version 1 and explicit updated_at', async () => {
    const stateJson = JSON.stringify(SAMPLE_STATE);
    const created = await createSharedPage(db, {
      id: '5Q25jl1374',
      stateJson,
      stateBytes: stateJson.length,
      creatorIpHash: 'hash',
    });

    expect(created.version).toBe(1);
    expect(created.updatedAt.getTime()).toBeGreaterThan(0);

    const row = await loadSharedPage(db, '5Q25jl1374');
    expect(row?.version).toBe(1);
    expect(row?.updatedAt?.getTime()).toBe(created.updatedAt.getTime());
  });

  it('updates with the current version and increments version', async () => {
    const initialJson = JSON.stringify(SAMPLE_STATE);
    await createSharedPage(db, {
      id: 'abc1234567',
      stateJson: initialJson,
      stateBytes: initialJson.length,
      creatorIpHash: 'hash',
    });

    const nextState = {
      ...SAMPLE_STATE,
      meta: { ...SAMPLE_STATE.meta, page: 'Updated Page' },
    };
    const nextJson = JSON.stringify(nextState);

    const result = await updateSharedPage(db, {
      id: 'abc1234567',
      clientVersion: 1,
      stateJson: nextJson,
      stateBytes: nextJson.length,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.version).toBe(2);
    expect(result.updatedAt.getTime()).toBeGreaterThan(0);

    const row = await loadSharedPage(db, 'abc1234567');
    expect(row?.version).toBe(2);
    expect(JSON.parse(row!.stateJson).meta.page).toBe('Updated Page');
  });

  it('returns version_conflict for stale version', async () => {
    const stateJson = JSON.stringify(SAMPLE_STATE);
    await createSharedPage(db, {
      id: 'staleversion',
      stateJson,
      stateBytes: stateJson.length,
      creatorIpHash: 'hash',
    });

    await updateSharedPage(db, {
      id: 'staleversion',
      clientVersion: 1,
      stateJson,
      stateBytes: stateJson.length,
    });

    const result = await updateSharedPage(db, {
      id: 'staleversion',
      clientVersion: 1,
      stateJson,
      stateBytes: stateJson.length,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('version_conflict');
    expect(result.currentVersion).toBe(2);
  });

  it('rejects updates to revoked pages', async () => {
    const stateJson = JSON.stringify(SAMPLE_STATE);
    await createSharedPage(db, {
      id: 'revokedpage',
      stateJson,
      stateBytes: stateJson.length,
      creatorIpHash: 'hash',
    });

    const row = await loadSharedPage(db, 'revokedpage');
    expect(row).not.toBeNull();

    const { sharedPages } = schema;
    const { eq } = await import('drizzle-orm');
    await db.update(sharedPages).set({ revokedAt: new Date() }).where(eq(sharedPages.id, 'revokedpage'));

    const result = await updateSharedPage(db, {
      id: 'revokedpage',
      clientVersion: 1,
      stateJson,
      stateBytes: stateJson.length,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('revoked');
  });

  it('rejects updates to expired pages', async () => {
    const stateJson = JSON.stringify(SAMPLE_STATE);
    await createSharedPage(db, {
      id: 'expiredpage',
      stateJson,
      stateBytes: stateJson.length,
      creatorIpHash: 'hash',
    });

    const { sharedPages } = schema;
    const { eq } = await import('drizzle-orm');
    await db
      .update(sharedPages)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(sharedPages.id, 'expiredpage'));

    const result = await updateSharedPage(db, {
      id: 'expiredpage',
      clientVersion: 1,
      stateJson,
      stateBytes: stateJson.length,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('expired');
  });
});
