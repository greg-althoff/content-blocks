import {
  SHARE_RATE_LIMIT_CLEANUP_MS,
  SHARE_RATE_LIMIT_WINDOW_MS,
} from '../../shared/limits';
import { getDb } from './db';
import { getShareRateLimitMax } from './env';

type RateLimitResult = { allowed: true; remaining: number } | { allowed: false; remaining: 0 };

export async function consumeShareRateLimit(ipHash: string): Promise<RateLimitResult> {
  const { client } = getDb();
  const limit = getShareRateLimitMax();
  const now = Date.now();
  const windowStart = Math.floor(now / SHARE_RATE_LIMIT_WINDOW_MS) * SHARE_RATE_LIMIT_WINDOW_MS;
  const cleanupBefore = now - SHARE_RATE_LIMIT_CLEANUP_MS;

  if (Math.random() < 0.05) {
    await client.execute({
      sql: 'DELETE FROM share_rate_limits WHERE window_start < ?',
      args: [cleanupBefore],
    });
  }

  const result = await client.execute({
    sql: `
      INSERT INTO share_rate_limits (ip_hash, window_start, request_count)
      VALUES (?, ?, 1)
      ON CONFLICT(ip_hash, window_start) DO UPDATE SET
        request_count = CASE
          WHEN share_rate_limits.request_count >= ? THEN share_rate_limits.request_count
          ELSE share_rate_limits.request_count + 1
        END
      RETURNING request_count AS request_count
    `,
    args: [ipHash, windowStart, limit],
  });

  const count = Number(result.rows[0]?.request_count ?? 1);
  if (count > limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: Math.max(0, limit - count) };
}
