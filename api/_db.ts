import { neon, Pool } from '@neondatabase/serverless';
import fs from 'fs';

function loadLocalEnv() {
  if (process.env.DATABASE_URL) return;
  try {
    const content = fs.readFileSync('.env.local', 'utf8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        let value = (match[2] || '').trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        process.env[match[1]] = value;
      }
    });
  } catch {
    // Ignore missing local env file
  }
}

/**
 * Returns a Neon serverless SQL client instance when DATABASE_URL is set,
 * or null when running in offline/local mock mode.
 */
export function getDb() {
  loadLocalEnv();
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
  loadLocalEnv();
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
    const result = await (sql as any).query(sqlQuery, params);
    return result as T[];
  } catch (err) {
    console.error('PostgreSQL query error:', err);
    throw err;
  }
}
