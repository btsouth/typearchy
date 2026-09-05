CREATE TABLE moderation_reviews (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  reviewer_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('approved', 'rejected')),
  note TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_moderation_reviews_challenge ON moderation_reviews(challenge_id, created_at DESC);
