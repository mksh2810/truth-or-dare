import { neon, Pool } from '@neondatabase/serverless';

/**
 * Returns a Neon serverless SQL client instance when DATABASE_URL is set,
 * or null when running in offline/local mock mode.
 */
export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !databaseUrl.trim()) {
    return null;
  }
  return neon(databaseUrl);
}

/**
 * Returns a connection Pool for transactions or batch scripts.
 */
export function getDbPool() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !databaseUrl.trim()) {
    return null;
  }
  return new Pool({ connectionString: databaseUrl });
}

/**
 * Parameterized query helper that executes on PostgreSQL when configured,
 * or returns null / mock fallback if DATABASE_URL is unset.
 */
export async function query<T = any>(
  sqlQuery: string,
  params: any[] = []
): Promise<T[] | null> {
  const sql = getDb();
  if (!sql) {
    return null;
  }

  try {
    const result = await (sql as any)(sqlQuery, params);
    return result as T[];
  } catch (err) {
    console.error('PostgreSQL query error:', err);
    throw err;
  }
}
