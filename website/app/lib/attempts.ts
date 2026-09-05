import { db } from './db';

export async function findAttempt(slug: string) {
  if (!/^[a-z0-9]{12}$/.test(slug)) return null;
  return db().prepare(`SELECT a.slug, a.duration_ms, a.wpm, a.accuracy, a.errors, a.raw_wpm, a.progress_json, a.theme_json, a.created_at, p.handle,
    c.slug AS challenge_slug, c.title, c.language, c.passage, c.attribution, c.rules_json
    FROM challenge_attempts a JOIN profiles p ON p.id = a.profile_id
    JOIN challenges c ON c.id = a.challenge_id JOIN profiles creator ON creator.id = c.creator_id
    WHERE a.slug = ? AND a.published = 1 AND p.visibility = 'public'
      AND c.visibility != 'hidden' AND c.moderation = 'approved' AND creator.visibility = 'public'`)
    .bind(slug).first<{ slug: string; duration_ms: number; wpm: number; accuracy: number; errors: number; raw_wpm: number; progress_json: string; theme_json: string; created_at: number; attribution: string; rules_json: string;
      handle: string; challenge_slug: string; title: string; language: string; passage: string }>();
}
