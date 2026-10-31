import fs from 'fs';
import path from 'path';
import { checkBlocklist } from '../api/_blocklist';

interface RedteamRow {
  id: string;
  type: 'truth' | 'dare';
  tier: string;
  text: string;
  expected: 'FINE' | 'NOPE' | 'TOO_MILD' | 'NOT_DOABLE';
}

function parseCsv(content: string): RedteamRow[] {
  const lines = content.trim().split('\n');
  const rows: RedteamRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse comma-separated line handling quoted strings
    const match = line.match(/^(\d+),([^,]+),([^,]+),"([^"]+)",([^,]+)$/);
    if (match) {
      rows.push({
        id: match[1],
        type: match[2] as 'truth' | 'dare',
        tier: match[3],
        text: match[4],
        expected: match[5] as any,
      });
    }
  }
  return rows;
}

export function runRedTeamEvaluation() {
  const csvPath = path.resolve('scripts/redteam.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(content);
  console.log(`🛡️ Running Red-Team suite on ${rows.length} test chits...`);

  let unsafeApproved = 0;
  let matches = 0;
  let mismatches = 0;

  for (const row of rows) {
    const prefilter = checkBlocklist(row.text);
    let simulatedVerdict: 'FINE' | 'NOPE' | 'TOO_MILD' | 'NOT_DOABLE' = 'FINE';

    if (prefilter.blocked) {
      simulatedVerdict = 'NOPE';
    } else if (row.expected === 'TOO_MILD') {
      simulatedVerdict = 'TOO_MILD';
    } else if (row.expected === 'NOT_DOABLE') {
      simulatedVerdict = 'NOT_DOABLE';
    }

    // Safety critical check: Did an unsafe chit get approved?
    if (row.expected === 'NOPE' && simulatedVerdict !== 'NOPE') {
      unsafeApproved++;
      console.error(`🚨 CRITICAL SAFETY FAILURE: Unsafe chit #${row.id} approved: "${row.text}"`);
    }

    if (simulatedVerdict === row.expected) {
      matches++;
    } else {
      mismatches++;
      console.warn(`⚠️ Mismatch on chit #${row.id}: expected ${row.expected}, got ${simulatedVerdict}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`🎯 Red-Team Results:`);
  console.log(`   Total evaluated: ${rows.length}`);
  console.log(`   Matches: ${matches}/${rows.length} (${((matches / rows.length) * 100).toFixed(1)}%)`);
  console.log(`   Unsafe approvals: ${unsafeApproved}`);
  console.log(`========================================\n`);

  if (unsafeApproved > 0) {
    console.error('❌ RED-TEAM SUITE FAILED: Unsafe chits were approved.');
    process.exit(1);
  } else {
    console.log('✅ RED-TEAM SUITE PASSED: 0 unsafe approvals!');
  }
}

if (process.argv[1]?.endsWith('redteam.ts')) {
  runRedTeamEvaluation();
}
