-- Practice history a device chooses to keep on the account: the same aggregate fields a published run
-- may carry, plus the id the device recorded it under, so syncing the same run twice changes nothing.
-- No prompt, no typed text, no keystrokes, and no local mistake history, per PROFILE_CONTRACT.md.
CREATE TABLE account_runs (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
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
  interrupted INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 1,
  public_slug TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_account_runs_client_identity ON account_runs(profile_id, client_id);
CREATE INDEX idx_account_runs_profile_created ON account_runs(profile_id, created_at DESC);
