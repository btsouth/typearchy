import { authenticateDevice, db, errorResponse, json, readJson } from '../../../lib/db';
import { linkVisibleSql } from '../../../lib/challenges';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect your profile first' }, 401);
    const cursor = new URL(request.url).searchParams.get('cursor');
    let before = Number.MAX_SAFE_INTEGER; let beforeId = '\uffff';
    if (cursor) { try { const values = JSON.parse(cursor); if (!Array.isArray(values) || !Number.isSafeInteger(values[0]) || values[0] < 0 || typeof values[1] !== 'string' || values[1].length > 100) throw new Error(); before = values[0]; beforeId = values[1]; } catch { return json({error:'Invalid history cursor'},400); } }
    const attempts = await db().prepare(`SELECT a.id, a.slug, a.duration_ms, a.wpm, a.accuracy, a.published, a.created_at,
      c.slug AS challenge_slug, c.title, c.moderation, c.visibility, creator.visibility AS creator_visibility
      FROM challenge_attempts a JOIN challenges c ON c.id = a.challenge_id
      JOIN profiles creator ON creator.id = c.creator_id
      WHERE a.profile_id = ? AND (a.created_at < ? OR (a.created_at = ? AND a.id < ?)) ORDER BY a.created_at DESC, a.id DESC LIMIT 101`).bind(identity.profileId, before, before, beforeId).all();
    const rows = attempts.results.slice(0,100); const last = rows.at(-1);
    return json({ attempts: rows, nextCursor: attempts.results.length > 100 && last ? JSON.stringify([last.created_at,last.id]) : null });
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
        WHERE ${linkVisibleSql()}))`)
      .bind(Number(body.published), body.id, identity.profileId, Number(body.published)).run();
    if (!result.meta.changes) return json({ error: 'Result is unavailable, or its passage can no longer be shared' }, 404);
    return json({ published: body.published });
  } catch (error) { return errorResponse(error); }
}
