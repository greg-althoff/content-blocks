import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const sharedPages = sqliteTable(
  'shared_pages',
  {
    id: text('id').primaryKey(),
    stateJson: text('state_json').notNull(),
    stateBytes: integer('state_bytes').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
      updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`0`),
    version: integer('version').notNull().default(1),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
    creatorIpHash: text('creator_ip_hash'),
  },
  (t) => [
    index('shared_pages_created_at_idx').on(t.createdAt),
    index('shared_pages_updated_at_idx').on(t.updatedAt),
    index('shared_pages_expires_at_idx').on(t.expiresAt),
  ],
);

export const shareRateLimits = sqliteTable(
  'share_rate_limits',
  {
    ipHash: text('ip_hash').notNull(),
    windowStart: integer('window_start', { mode: 'timestamp_ms' }).notNull(),
    requestCount: integer('request_count').notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.ipHash, t.windowStart] })],
);

export const sharePutRateLimits = sqliteTable(
  'share_put_rate_limits',
  {
    pageId: text('page_id').notNull(),
    ipHash: text('ip_hash').notNull(),
    windowStart: integer('window_start', { mode: 'timestamp_ms' }).notNull(),
    requestCount: integer('request_count').notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.pageId, t.ipHash, t.windowStart] })],
);
