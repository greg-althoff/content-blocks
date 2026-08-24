import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { getTursoCredentials } from './env';
import * as schema from './schema';

let client: ReturnType<typeof createClient> | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    const credentials = getTursoCredentials();
    client = createClient(credentials);
    db = drizzle(client, { schema });
  }
  return { db, client: client! };
}
