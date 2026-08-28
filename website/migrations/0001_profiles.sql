PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
  recovery_hash TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE TABLE IF NOT EXISTS connections (
  code TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  claimed_at INTEGER
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL,
  content_version TEXT NOT NULL,
  mode TEXT NOT NULL,
  challenge_key TEXT NOT NULL,
  target TEXT NOT NULL,
  duration INTEGER NOT NULL,
  wpm REAL NOT NULL,
  raw_wpm REAL NOT NULL,
  accuracy REAL NOT NULL,
  consistency REAL NOT NULL,
  errors INTEGER NOT NULL,
  pace_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  pinned_at INTEGER
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_devices_profile_active
  ON devices(profile_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_connections_expires
  ON connections(expires_at);
CREATE INDEX IF NOT EXISTS idx_runs_profile_created
  ON runs(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_profile_pinned
  ON runs(profile_id, pinned_at DESC) WHERE pinned_at IS NOT NULL;

PRAGMA optimize;
