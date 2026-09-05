ALTER TABLE challenges ADD COLUMN moderation TEXT NOT NULL DEFAULT 'pending'
  CHECK (moderation IN ('pending', 'approved', 'rejected'));
ALTER TABLE challenges ADD COLUMN review_note TEXT NOT NULL DEFAULT '';
CREATE INDEX idx_challenges_review ON challenges(moderation, created_at);
CREATE TABLE content_reports (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  reporter_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX idx_reports_unresolved ON content_reports(created_at) WHERE resolved_at IS NULL;
PRAGMA optimize;
