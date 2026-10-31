import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

/**
 * Runs all SQL migrations in /migrations against PostgreSQL.
 * Run with: npx tsx scripts/migrate-postgres.ts
 */
export async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set. Please provide a valid PostgreSQL connection string.');
    console.log('   Example: DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require"');
    process.exit(1);
  }

  console.log('🚀 Connecting to PostgreSQL via Neon Serverless driver...');
  const sql = neon(databaseUrl);

  const migrationsDir = path.resolve('migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  console.log(`📁 Found ${files.length} migration file(s) in /migrations.`);

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file);
    console.log(`⏳ Applying migration: ${file}...`);
    const sqlContent = fs.readFileSync(fullPath, 'utf8');

    try {
      await (sql as any)(sqlContent);
      console.log(`✅ Successfully applied ${file}`);
    } catch (err) {
      console.error(`❌ Migration failed on ${file}:`, err);
      process.exit(1);
    }
  }

  console.log('\n🎉 All PostgreSQL migrations completed successfully!');
}

if (process.argv[1]?.endsWith('migrate-postgres.ts')) {
  runMigrations().catch((err) => {
    console.error('Fatal migration error:', err);
    process.exit(1);
  });
}
