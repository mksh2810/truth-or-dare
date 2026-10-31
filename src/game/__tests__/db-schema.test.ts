import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getCommunityChits } from '../../../api/community-deck';

describe('PostgreSQL Architecture & Schema (Option A)', () => {
  it('has valid SQL migration file defining required tables', () => {
    const migrationPath = path.resolve('migrations/0001_init_postgres.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sql = fs.readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS users');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS learning_chits');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS community_deck');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS judge_lines');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS reports');
  });

  it('getCommunityChits returns fallback seed items when DATABASE_URL is unset', async () => {
    // When no DB is connected, fallback returns seed items
    const chits = await getCommunityChits('truth', 'spicy', 2);
    expect(chits.length).toBeGreaterThan(0);
    expect(chits[0].type).toBe('truth');
    expect(chits[0].tier).toBe('spicy');
  });
});
