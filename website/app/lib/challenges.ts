import { db } from './db';
import { curatedPassages } from './curatedPassages';
import type { ChallengeLanguage, ChallengeRules } from './challengeContract';

export type ChallengeRow = {
  id: string; slug: string; creator_id: string; title: string; passage: string;
  language: ChallengeLanguage; attribution: string; rules_json: string;
  content_hash: string; visibility: string; moderation: string; review_note: string; created_at: number; handle: string;
};
export type PublicChallenge = {
  slug: string; title: string; passage: string; language: ChallengeLanguage;
  attribution: string; rules: ChallengeRules; contentHash: string; handle: string;
  description?: string; sourceUrl?: string; author?: string;
};
export type Standing = {
  slug: string; handle: string; duration_ms: number; wpm: number; accuracy: number;
  errors: number; created_at: number;
};

export async function findChallenge(slug: string, viewerId?: string) {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(slug)) return null;
  return db().prepare(`SELECT c.*, p.handle FROM challenges c
    JOIN profiles p ON p.id = c.creator_id
    WHERE c.slug = ? AND ((c.visibility != 'hidden' AND c.moderation = 'approved' AND p.visibility = 'public')
      OR c.creator_id = ?)`)
    .bind(slug, viewerId || null).first<ChallengeRow>();
}

export function publicChallenge(row: ChallengeRow): PublicChallenge {
  const curated = curatedPassages.find(item => item.title === row.title && item.passage === row.passage && item.language === row.language && item.attribution === row.attribution);
  const context = curated && 'description' in curated ? { description: curated.description, sourceUrl: curated.sourceUrl, author: curated.author } : {};
  return { ...context, slug: row.slug, title: row.title, passage: row.passage, language: row.language,
    attribution: row.attribution, rules: JSON.parse(row.rules_json), contentHash: row.content_hash, handle: row.handle };
}

export async function challengeStandings(challengeId: string): Promise<Standing[]> {
  // Rank each person's best attempt, never let retries fill the leaderboard.
  const result = await db().prepare(`SELECT slug, handle, duration_ms, wpm, accuracy, errors, created_at FROM (
    SELECT a.slug, p.handle, a.duration_ms, a.wpm, a.accuracy, a.errors, a.created_at,
      ROW_NUMBER() OVER (PARTITION BY a.profile_id ORDER BY a.duration_ms, a.errors, a.created_at, a.id) AS personal_rank
    FROM challenge_attempts a JOIN profiles p ON p.id = a.profile_id
    WHERE a.challenge_id = ? AND a.published = 1 AND p.visibility = 'public'
  ) WHERE personal_rank = 1 ORDER BY duration_ms, errors, created_at, slug LIMIT 50`)
    .bind(challengeId).all<Standing>();
  return result.results;
}

export async function challengeGhost(challengeId: string, slug?: string) {
  const row = await db().prepare(`SELECT a.slug, p.handle, a.duration_ms, a.progress_json
    FROM challenge_attempts a JOIN profiles p ON p.id = a.profile_id
    JOIN challenges c ON c.id = a.challenge_id
    WHERE a.challenge_id = ? AND a.published = 1 AND p.visibility = 'public'
      AND (? IS NULL OR a.slug = ?)
    ORDER BY (a.profile_id = c.creator_id) DESC, a.duration_ms, a.created_at LIMIT 1`)
    .bind(challengeId, slug || null, slug || null)
    .first<{ slug: string; handle: string; duration_ms: number; progress_json: string }>();
  return row ? { slug: row.slug, handle: row.handle, durationMs: row.duration_ms, progress: JSON.parse(row.progress_json) as number[][] } : null;
}
