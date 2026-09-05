import { db, errorResponse, json, readJson } from '../../lib/db';
import { requireModerator } from '../../lib/moderation';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    await requireModerator(request);
    const [challenges, reports, profileReports, restrictedProfiles] = await Promise.all([
      db().prepare(`SELECT c.slug, c.title, c.passage, c.language, c.attribution, p.handle
        FROM challenges c JOIN profiles p ON p.id = c.creator_id WHERE c.moderation = 'pending'
        ORDER BY c.created_at LIMIT 50`).all(),
      db().prepare(`SELECT r.id, r.reason, r.detail, c.slug, c.title, c.passage, c.attribution, p.handle
        FROM content_reports r JOIN challenges c ON c.id = r.challenge_id JOIN profiles p ON p.id = c.creator_id
        WHERE r.resolved_at IS NULL ORDER BY r.created_at LIMIT 50`).all(),
      db().prepare(`SELECT r.id, r.reason, r.detail, p.handle, p.suspended FROM profile_reports r
        JOIN profiles p ON p.id = r.profile_id WHERE r.resolved_at IS NULL ORDER BY r.created_at LIMIT 50`).all(),
      db().prepare(`SELECT handle, suspended, moderation_note FROM profiles WHERE suspended = 1 ORDER BY updated_at DESC LIMIT 50`).all(),
    ]);
    return json({ challenges: challenges.results, reports: reports.results, profileReports: profileReports.results, restrictedProfiles: restrictedProfiles.results });
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  try {
    const moderator = await requireModerator(request);
    const body = await readJson(request) as { slug?: string; status?: string; note?: string; handle?: string; action?: string };
    if (body.handle !== undefined) {
      if (typeof body.handle !== 'string' || !['suspend', 'restore', 'dismiss'].includes(body.action || '') || typeof body.note !== 'string' || !body.note.trim() || body.note.length > 400)
        return json({ error: 'Choose an action and a short review note' }, 400);
      const profile = await db().prepare('SELECT id FROM profiles WHERE handle = ? COLLATE NOCASE').bind(body.handle).first<{id: string}>();
      if (!profile) return json({ error: 'Profile not found' }, 404);
      if (profile.id === moderator.profileId) return json({ error: 'A moderator cannot review their own profile' }, 409);
      const database = db();
      const statements = [database.prepare(`INSERT INTO profile_reviews (id, profile_id, reviewer_id, outcome, note, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(crypto.randomUUID(), profile.id, moderator.profileId, body.action, body.note.trim(), Date.now())];
      if (body.action !== 'dismiss') statements.push(database.prepare(`UPDATE profiles SET suspended = ?, visibility = 'private', moderation_note = ?, updated_at = ? WHERE id = ?`)
        .bind(body.action === 'suspend' ? 1 : 0, body.note.trim(), Math.floor(Date.now() / 1000), profile.id));
      statements.push(database.prepare('UPDATE profile_reports SET resolved_at = ? WHERE profile_id = ? AND resolved_at IS NULL').bind(Date.now(), profile.id));
      await database.batch(statements);
      return json({ reviewed: true });
    }
    if (!body.slug || !['approved', 'rejected'].includes(body.status || '') || typeof body.note !== 'string' || body.note.length > 400 || (body.status === 'rejected' && !body.note.trim()))
      return json({ error: 'Choose an outcome and a short review note' }, 400);
    const results = await db().batch([
      db().prepare(`INSERT INTO moderation_reviews (id, challenge_id, reviewer_id, outcome, note, created_at)
        SELECT ?, id, ?, ?, ?, ? FROM challenges WHERE slug = ?`).bind(crypto.randomUUID(), moderator.profileId, body.status, body.note.trim(), Date.now(), body.slug),
      db().prepare('UPDATE challenges SET moderation = ?, review_note = ? WHERE slug = ?').bind(body.status, body.note, body.slug),
      db().prepare('UPDATE content_reports SET resolved_at = ? WHERE challenge_id = (SELECT id FROM challenges WHERE slug = ?) AND resolved_at IS NULL').bind(Date.now(), body.slug),
    ]);
    if (!results[0].meta.changes) return json({ error: 'Challenge not found' }, 404);
    return json({ reviewed: true });
  } catch (error) { return errorResponse(error); }
}
