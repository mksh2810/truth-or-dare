-- PostgreSQL Schema for Truth or Dare (Chit Table)
-- Scaled persistent storage: Users, Learning candidates, Community Deck, Owl Takes, Reports

-- Optional: enable pgvector for vector cosine search if supported
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension not installed or permission denied; using fallback text matching.';
END
$$;

-- 1. Persistent Users table
CREATE TABLE IF NOT EXISTS users (
  uid VARCHAR(128) PRIMARY KEY,
  display_name VARCHAR(64) NOT NULL,
  avatar_id VARCHAR(32) DEFAULT 'owl',
  is_guest BOOLEAN DEFAULT true,
  total_xp INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  passes INTEGER DEFAULT 0,
  fails INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  unlocked JSONB DEFAULT '["bottle-default"]'::jsonb,
  equipped JSONB DEFAULT '{"bottle":"default","stamp":"FINE"}'::jsonb,
  share_chits_for_learning BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Learning Chits table
CREATE TABLE IF NOT EXISTS learning_chits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  normalised_text TEXT NOT NULL,
  type VARCHAR(8) NOT NULL CHECK (type IN ('truth', 'dare')),
  tier VARCHAR(16) NOT NULL CHECK (tier IN ('mild', 'spicy', 'legend')),
  author_uid VARCHAR(128) NOT NULL,
  embedding REAL[], -- Flexible array or vector(768)
  plays INTEGER DEFAULT 0,
  passes INTEGER DEFAULT 0,
  fails INTEGER DEFAULT 0,
  fire INTEGER DEFAULT 0,
  mid INTEGER DEFAULT 0,
  too_much INTEGER DEFAULT 0,
  distinct_raters INTEGER DEFAULT 0,
  rater_uids JSONB DEFAULT '[]'::jsonb,
  reports INTEGER DEFAULT 0,
  status VARCHAR(16) DEFAULT 'candidate' CHECK (status IN ('candidate', 'promoted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  promoted_at TIMESTAMPTZ,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_learning_chits_status ON learning_chits(status, fire DESC);
CREATE INDEX IF NOT EXISTS idx_learning_chits_tier ON learning_chits(tier, type);

-- 3. Promoted Community Deck
CREATE TABLE IF NOT EXISTS community_deck (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chit_id UUID REFERENCES learning_chits(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  type VARCHAR(8) NOT NULL CHECK (type IN ('truth', 'dare')),
  tier VARCHAR(16) NOT NULL CHECK (tier IN ('mild', 'spicy', 'legend')),
  fire_score REAL NOT NULL,
  plays INTEGER DEFAULT 0,
  promoted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_deck_query ON community_deck(tier, type, fire_score DESC);

-- 4. Owl Roast Lines
CREATE TABLE IF NOT EXISTS judge_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text VARCHAR(80) NOT NULL,
  language VARCHAR(8) NOT NULL CHECK (language IN ('en', 'hi')),
  verdict_context VARCHAR(16) NOT NULL CHECK (verdict_context IN ('FINE', 'NOPE', 'TOO_MILD', 'NOT_DOABLE')),
  tier VARCHAR(16) NOT NULL,
  embedding REAL[],
  up INTEGER DEFAULT 0,
  down INTEGER DEFAULT 0,
  distinct_raters INTEGER DEFAULT 0,
  voter_uids JSONB DEFAULT '[]'::jsonb,
  uses INTEGER DEFAULT 0,
  reports INTEGER DEFAULT 0,
  status VARCHAR(16) DEFAULT 'candidate' CHECK (status IN ('candidate', 'promoted', 'retired', 'rejected')),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_judge_lines_status ON judge_lines(status, language, up DESC);

-- 5. Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(16) NOT NULL,
  reporter_uid VARCHAR(128) NOT NULL,
  target_uid VARCHAR(128) NOT NULL,
  reason VARCHAR(64) NOT NULL,
  note TEXT,
  turn_id VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_room ON reports(room_code);
