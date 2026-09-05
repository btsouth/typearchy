import { authenticateDevice, db, errorResponse, json, readJson } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect your profile first' }, 401);
    const attempts = await db().prepare(`SELECT a.id, a.slug, a.duration_ms, a.wpm, a.accuracy, a.published,
      c.slug AS challenge_slug, c.title, c.moderation, c.visibility, creator.visibility AS creator_visibility
      FROM challenge_attempts a JOIN challenges c ON c.id = a.challenge_id
      JOIN profiles creator ON creator.id = c.creator_id
      WHERE a.profile_id = ? ORDER BY a.created_at DESC LIMIT 100`).bind(identity.profileId).all();
    return json({ attempts: attempts.results });
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect your profile first' }, 401);
    const body = await readJson(request) as { id?: string; published?: boolean };
    if (typeof body.id !== 'string' || typeof body.published !== 'boolean') return json({ error: 'Choose a result and visibility' }, 400);
    if (body.published && identity.visibility !== 'public') return json({ error: 'Make your profile public before publishing a result' }, 409);
    const result = await db().prepare(`UPDATE challenge_attempts SET published = ? WHERE id = ? AND profile_id = ?
      AND (? = 0 OR challenge_id IN (SELECT c.id FROM challenges c JOIN profiles p ON p.id = c.creator_id
        WHERE c.moderation = 'approved' AND c.visibility != 'hidden' AND p.visibility = 'public'))`)
      .bind(Number(body.published), body.id, identity.profileId, Number(body.published)).run();
    if (!result.meta.changes) return json({ error: 'Result is unavailable, or its passage is not approved for sharing' }, 404);
    return json({ published: body.published });
  } catch (error) { return errorResponse(error); }
}
