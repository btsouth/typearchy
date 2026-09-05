ALTER TABLE runs ADD COLUMN client_id TEXT;
CREATE UNIQUE INDEX idx_runs_client_identity ON runs(profile_id, client_id) WHERE client_id IS NOT NULL;
