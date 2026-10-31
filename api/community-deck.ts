import { query } from './_db';
import { SEED_COMMUNITY_CHITS } from '../scripts/seed-community-deck';

export interface CommunityChitRow {
  id: string;
  text: string;
  type: 'truth' | 'dare';
  tier: 'mild' | 'spicy' | 'legend';
  fire_score: number;
  plays: number;
}

/**
 * Retrieves top-ranked community chits from PostgreSQL by tier & type.
 * Falls back to built-in seed items if PostgreSQL is offline or empty.
 */
export async function getCommunityChits(
  type?: 'truth' | 'dare',
  tier?: 'mild' | 'spicy' | 'legend',
  limit = 4
): Promise<CommunityChitRow[]> {
  let sql = 'SELECT id, text, type, tier, fire_score, plays FROM community_deck WHERE 1=1';
  const params: any[] = [];

  if (type) {
    params.push(type);
    sql += ` AND type = $${params.length}`;
  }
  if (tier) {
    params.push(tier);
    sql += ` AND tier = $${params.length}`;
  }

  sql += ' ORDER BY fire_score DESC, plays DESC LIMIT $' + (params.length + 1);
  params.push(limit);

  try {
    const rows = await query<CommunityChitRow>(sql, params);
    if (rows && rows.length > 0) {
      return rows;
    }
  } catch (err) {
    console.warn('PostgreSQL community deck query error, falling back to seed deck:', err);
  }

  // Graceful fallback to seed items
  return SEED_COMMUNITY_CHITS.filter((item) => {
    if (type && item.type !== type) return false;
    if (tier && item.tier !== tier) return false;
    return true;
  })
    .slice(0, limit)
    .map((item, i) => ({
      id: `fallback-${i}`,
      text: item.text,
      type: item.type as any,
      tier: item.tier as any,
      fire_score: item.fireScore,
      plays: item.plays,
    }));
}
