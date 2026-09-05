ALTER TABLE challenge_attempts ADD COLUMN theme_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE runs ADD COLUMN theme_json TEXT NOT NULL DEFAULT '{}';
