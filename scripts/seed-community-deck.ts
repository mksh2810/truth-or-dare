import fs from 'fs';
import path from 'path';
import { query } from '../api/_db';

/**
 * Seed script for initial Community Deck items (LEARN-5, LEARN-6).
 * You can run this with: npx tsx scripts/seed-community-deck.ts
 */
export const SEED_COMMUNITY_CHITS = [
  // Mild Truths
  {
    type: 'truth',
    tier: 'mild',
    text: 'What is the silliest lie you believed as a child?',
    fireScore: 0.88,
    plays: 12,
  },
  {
    type: 'truth',
    tier: 'mild',
    text: 'What is your absolute guiltiest comfort food?',
    fireScore: 0.82,
    plays: 8,
  },
  // Mild Dares
  {
    type: 'dare',
    tier: 'mild',
    text: 'Do your best runway model walk across the room while giving a dramatic speech.',
    fireScore: 0.91,
    plays: 15,
  },
  {
    type: 'dare',
    tier: 'mild',
    text: 'Speak in an exaggerated Shakespearean accent for the next 2 turns.',
    fireScore: 0.85,
    plays: 10,
  },
  // Spicy Truths
  {
    type: 'truth',
    tier: 'spicy',
    text: 'What is the most embarrassing thing currently in your search history?',
    fireScore: 0.95,
    plays: 24,
  },
  {
    type: 'truth',
    tier: 'spicy',
    text: 'Have you ever stalked an ex on a fake social media account?',
    fireScore: 0.89,
    plays: 18,
  },
  {
    type: 'truth',
    tier: 'spicy',
    text: 'Which person at this table would survive the longest in a zombie apocalypse?',
    fireScore: 0.86,
    plays: 14,
  },
  // Spicy Dares
  {
    type: 'dare',
    tier: 'spicy',
    text: 'Let the person to your left restyle your hair however they want for the rest of the game.',
    fireScore: 0.93,
    plays: 20,
  },
  {
    type: 'dare',
    tier: 'spicy',
    text: 'Give an impassioned graduation speech to a houseplant or empty chair.',
    fireScore: 0.87,
    plays: 11,
  },
  // Legend Truths & Dares
  {
    type: 'truth',
    tier: 'legend',
    text: 'What is a secret you swore you would take to the grave?',
    fireScore: 0.96,
    plays: 28,
  },
  {
    type: 'dare',
    tier: 'legend',
    text: 'Attempt to breakdance for 30 seconds with complete dramatic seriousness.',
    fireScore: 0.92,
    plays: 22,
  },
];

export async function generateSeedJson() {
  const output = SEED_COMMUNITY_CHITS.map((chit, idx) => ({
    id: `seed-chit-${idx + 1}`,
    ...chit,
    promotedAt: new Date().toISOString(),
    status: 'promoted',
  }));

  const outPath = path.resolve('src/data/seed-community-deck.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`✅ Generated seed community deck file at: ${outPath} (${output.length} items)`);

  // If PostgreSQL is reachable, seed into community_deck table
  try {
    const existing = await query('SELECT count(*)::int as count FROM community_deck');
    if (existing && existing[0]?.count === 0) {
      console.log('🌱 Seeding PostgreSQL community_deck table...');
      for (const item of SEED_COMMUNITY_CHITS) {
        await query(
          'INSERT INTO community_deck (text, type, tier, fire_score, plays) VALUES ($1, $2, $3, $4, $5)',
          [item.text, item.type, item.tier, item.fireScore, item.plays]
        );
      }
      console.log(`✅ Seeded ${SEED_COMMUNITY_CHITS.length} chits into Neon PostgreSQL community_deck table!`);
    } else if (existing) {
      console.log(`ℹ️ PostgreSQL community_deck already has ${existing[0]?.count} rows.`);
    }
  } catch (err) {
    console.warn('PostgreSQL seed skipped or failed:', err);
  }
}

if (process.argv[1]?.endsWith('seed-community-deck.ts')) {
  generateSeedJson().catch(console.error);
}
