import { authenticateDevice, db, errorResponse, json } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect your profile first' }, 401);
    const challenges = await db().prepare(`SELECT slug, title, language, visibility, moderation, review_note, created_at
      FROM challenges WHERE creator_id = ? ORDER BY created_at DESC LIMIT 100`).bind(identity.profileId).all();
    return json({ challenges: challenges.results });
  } catch (error) { return errorResponse(error); }
}
