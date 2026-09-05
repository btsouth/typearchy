PRAGMA foreign_keys = ON;

CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  creator_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  passage TEXT NOT NULL,
  language TEXT NOT NULL,
  attribution TEXT NOT NULL DEFAULT '',
  rules_json TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'hidden')),
  created_at INTEGER NOT NULL
);

CREATE TABLE attempt_sessions (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE TABLE challenge_attempts (
  id TEXT PRIMARY KEY REFERENCES attempt_sessions(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 1000),
  wpm REAL NOT NULL,
  raw_wpm REAL NOT NULL,
  accuracy REAL NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
  errors INTEGER NOT NULL,
  characters INTEGER NOT NULL,
  progress_json TEXT NOT NULL,
  recording_hash TEXT NOT NULL,
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_challenges_visible_created ON challenges(visibility, created_at DESC, id);
CREATE INDEX idx_challenges_creator ON challenges(creator_id, created_at DESC);
CREATE INDEX idx_attempt_sessions_expires ON attempt_sessions(expires_at) WHERE completed_at IS NULL;
CREATE INDEX idx_challenge_attempts_standings ON challenge_attempts(challenge_id, duration_ms, errors, created_at, id) WHERE published = 1;
CREATE INDEX idx_challenge_attempts_profile ON challenge_attempts(profile_id, created_at DESC);
PRAGMA optimize;
