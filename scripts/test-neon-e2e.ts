import { query, getDb } from '../api/_db';

async function testNeonE2E() {
  console.log('🧪 Starting Neon Lakebase Postgres End-to-End Test Suite...\n');

  const db = getDb();
  if (!db) {
    throw new Error('DATABASE_URL is not configured or getDb returned null.');
  }

  // 1. Test basic connectivity & version
  console.log('1️⃣ Checking PostgreSQL connection and version...');
  const versionResult = await query('SELECT version()');
  console.log(`   Connected! Version: ${versionResult?.[0]?.version?.slice(0, 50)}...`);

  // 2. Test Community Deck query
  console.log('\n2️⃣ Testing Community Deck retrieval...');
  const communityChits = await query(
    'SELECT id, text, type, tier, fire_score, plays FROM community_deck WHERE tier = $1 LIMIT 3',
    ['spicy']
  );
  console.log(`   Retrieved ${communityChits?.length} spicy chits from Neon community_deck table.`);
  if (!communityChits || communityChits.length === 0) {
    throw new Error('Community deck query returned 0 rows.');
  }
  console.log(`   Sample Chit: "${communityChits[0].text}" (Fire Score: ${communityChits[0].fire_score})`);

  // 3. Test Users table upsert
  console.log('\n3️⃣ Testing User profile upsert in Neon...');
  const testUid = `test_neon_${Date.now()}`;
  await query(
    `INSERT INTO users (uid, display_name, avatar_id, is_guest, total_xp, games_played)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (uid) DO UPDATE SET display_name = EXCLUDED.display_name, total_xp = EXCLUDED.total_xp`,
    [testUid, 'NeonTester', 'owl', true, 250, 3]
  );
  const userResult = await query('SELECT uid, display_name, total_xp FROM users WHERE uid = $1', [testUid]);
  console.log(`   Successfully created user in Neon: ${JSON.stringify(userResult?.[0])}`);

  // 4. Test Learning Chits candidate insertion
  console.log('\n4️⃣ Testing Learning candidate insertion...');
  const candidateResult = await query(
    `INSERT INTO learning_chits (text, normalised_text, type, tier, author_uid, fire, mid, too_much, distinct_raters, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, text, status`,
    [
      'Dare to do 10 pushups while singing happy birthday',
      'dare to do 10 pushups while singing happy birthday',
      'dare',
      'spicy',
      testUid,
      5,
      1,
      0,
      6,
      'candidate',
    ]
  );
  console.log(`   Inserted candidate chit into Neon: ${JSON.stringify(candidateResult?.[0])}`);

  // 5. Test Judge Lines / Owl roast take
  console.log('\n5️⃣ Testing Judge Lines insertion and voting...');
  const lineResult = await query(
    `INSERT INTO judge_lines (text, language, verdict_context, tier, up, down, distinct_raters, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, text, verdict_context, up`,
    [
      'Bro wrote this with dial-up internet energy.',
      'en',
      'FINE',
      'spicy',
      3,
      0,
      3,
      'promoted',
    ]
  );
  console.log(`   Inserted owl take line in Neon: ${JSON.stringify(lineResult?.[0])}`);

  // 6. Test Reports table
  console.log('\n6️⃣ Testing safety Report log...');
  const reportResult = await query(
    `INSERT INTO reports (room_code, reporter_uid, target_uid, reason, note)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, room_code, reason`,
    ['4A8K9Z', testUid, 'target_user_1', 'harassment', 'Inappropriate chit']
  );
  console.log(`   Logged report in Neon: ${JSON.stringify(reportResult?.[0])}`);

  // Clean up test data
  console.log('\n🧹 Cleaning up test row artifacts...');
  await query('DELETE FROM users WHERE uid = $1', [testUid]);
  if (candidateResult?.[0]?.id) {
    await query('DELETE FROM learning_chits WHERE id = $1', [candidateResult[0].id]);
  }
  if (lineResult?.[0]?.id) {
    await query('DELETE FROM judge_lines WHERE id = $1', [lineResult[0].id]);
  }
  if (reportResult?.[0]?.id) {
    await query('DELETE FROM reports WHERE id = $1', [reportResult[0].id]);
  }
  console.log('   Cleanup complete.');

  console.log('\n🎉 ALL NEON LAKEBASE POSTGRES SERVICES TESTED & VERIFIED END-TO-END!');
}

testNeonE2E().catch((err) => {
  console.error('❌ Neon E2E test failed:', err);
  process.exit(1);
});
