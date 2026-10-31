import { query } from './_db';

export interface UserProfilePayload {
  uid: string;
  displayName: string;
  avatarId?: string;
  isGuest?: boolean;
  totalXp?: number;
  gamesPlayed?: number;
  passes?: number;
  fails?: number;
  bestStreak?: number;
  unlocked?: string[];
  equipped?: { bottle: string; stamp: string };
  shareChitsForLearning?: boolean;
}

/**
 * Synchronizes user profile to PostgreSQL (upsert).
 */
export async function syncUserToPostgres(user: UserProfilePayload) {
  const sql = `
    INSERT INTO users (
      uid, display_name, avatar_id, is_guest, total_xp,
      games_played, passes, fails, best_streak,
      unlocked, equipped, share_chits_for_learning, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, NOW()
    )
    ON CONFLICT (uid) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      avatar_id = EXCLUDED.avatar_id,
      total_xp = EXCLUDED.total_xp,
      games_played = EXCLUDED.games_played,
      passes = EXCLUDED.passes,
      fails = EXCLUDED.fails,
      best_streak = EXCLUDED.best_streak,
      unlocked = EXCLUDED.unlocked,
      equipped = EXCLUDED.equipped,
      share_chits_for_learning = EXCLUDED.share_chits_for_learning,
      updated_at = NOW()
    RETURNING *;
  `;

  const params = [
    user.uid,
    user.displayName || 'Player',
    user.avatarId || 'owl',
    user.isGuest ?? true,
    user.totalXp || 0,
    user.gamesPlayed || 0,
    user.passes || 0,
    user.fails || 0,
    user.bestStreak || 0,
    JSON.stringify(user.unlocked || ['bottle-default']),
    JSON.stringify(user.equipped || { bottle: 'default', stamp: 'FINE' }),
    user.shareChitsForLearning ?? true,
  ];

  const rows = await query(sql, params);
  return rows ? rows[0] : null;
}
