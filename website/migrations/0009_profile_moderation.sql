ALTER TABLE profiles ADD COLUMN suspended INTEGER NOT NULL DEFAULT 0 CHECK (suspended IN (0, 1));
ALTER TABLE profiles ADD COLUMN moderation_note TEXT NOT NULL DEFAULT '';
CREATE TABLE profile_reports (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reporter_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('vulgar', 'hateful', 'impersonation', 'spam', 'other')),
  detail TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX idx_profile_reports_pending ON profile_reports(resolved_at, created_at);
CREATE TABLE profile_reviews (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('suspend', 'restore', 'dismiss')),
  note TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_profile_reviews_profile ON profile_reviews(profile_id, created_at DESC);
