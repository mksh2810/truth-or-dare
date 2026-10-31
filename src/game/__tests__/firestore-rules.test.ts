import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Firestore Security Rules Analysis', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  it('uses security rules version 2', () => {
    expect(rules).toContain("rules_version = '2';");
  });

  it('restricts user profiles to the authenticated user', () => {
    expect(rules).toMatch(/match \/users\/\{uid\} \{/);
    expect(rules).toContain('request.auth.uid == uid');
  });

  it('prohibits direct client writes to learning candidates (LEARN-2)', () => {
    expect(rules).toMatch(/match \/learning\/\{collection\}\/\{docId\} \{/);
    expect(rules).toContain('allow read, write: if false;');
  });

  it('prohibits direct client writes to community deck (LEARN-5)', () => {
    expect(rules).toMatch(/match \/community\/deck\/\{id\} \{/);
    expect(rules).toContain('allow write: if false;');
  });

  it('enforces membership checks for room entries and votes', () => {
    expect(rules).toContain('function isMember(code)');
    expect(rules).toContain('function isHost(code)');
  });

  it('restricts voting to one vote per voter per turn (request.auth.uid == uid)', () => {
    expect(rules).toMatch(/match \/votes\/\{uid\} \{/);
    expect(rules).toContain('request.auth.uid == uid');
  });

  it('allows ratings per voter per turn (LEARN-4)', () => {
    expect(rules).toMatch(/match \/ratings\/\{uid\} \{/);
    expect(rules).toContain('allow create, update: if signedIn() && isMember(code) && request.auth.uid == uid;');
  });

  it('restricts owl take author to current authenticated user (LEARN-7)', () => {
    expect(rules).toMatch(/match \/takes\/\{takeId\} \{/);
    expect(rules).toContain('request.resource.data.authorUid == request.auth.uid');
  });

  it('only allows hosts to write turns', () => {
    expect(rules).toMatch(/match \/turns\/\{turnId\} \{/);
    expect(rules).toContain('allow write: if signedIn() && isHost(code);');
  });
});
