CREATE INDEX idx_unclaimed_attempts_created ON challenge_attempts(created_at) WHERE profile_id IS NULL;
CREATE INDEX idx_challenges_library ON challenges(moderation, visibility, created_at DESC);
