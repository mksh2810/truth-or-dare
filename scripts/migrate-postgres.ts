import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

/**
 * Runs all SQL migrations in /migrations against PostgreSQL.
 * Run with: npx tsx scripts/migrate-postgres.ts
 */
export function splitSqlStatements(sqlText: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;

  const lines = sqlText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--')) continue;

    const dollarMatches = (line.match(/\$\$/g) || []).length;
    if (dollarMatches % 2 === 1) {
      inDollarQuote = !inDollarQuote;
    }

    current += line + '\n';

    if (!inDollarQuote && trimmed.endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

export async function runMigrations() {
  if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_UNPOOLED) {
    try {
      const envFile = fs.readFileSync('.env.local', 'utf8');
      envFile.split('\n').forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match && !process.env[match[1]]) {
          let value = (match[2] || '').trim();
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
          process.env[match[1]] = value;
        }
      });
    } catch {}
  }

  // Neon best practice: use unpooled direct connection for migrations, pooled for apps
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

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
    const statements = splitSqlStatements(sqlContent);
    console.log(`   Found ${statements.length} statement(s) in ${file}`);

    try {
      for (let i = 0; i < statements.length; i++) {
        await (sql as any).query(statements[i]);
      }
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
