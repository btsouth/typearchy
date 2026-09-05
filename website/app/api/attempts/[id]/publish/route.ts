import { authenticateDevice, db, errorResponse, json, sha256 } from '../../../../lib/db';
import { linkVisibleSql } from '../../../../lib/challenges';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect your profile to publish this result' }, 401);
    if (identity.visibility !== 'public') return json({ error: 'Make your profile public before publishing a result' }, 409);
    const token = request.headers.get('x-attempt-token') || '';
    if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: 'Attempt session is missing' }, 401);
    const session = await db().prepare(`SELECT s.id, a.slug FROM attempt_sessions s
      JOIN challenge_attempts a ON a.id = s.id
      JOIN challenges c ON c.id = s.challenge_id JOIN profiles p ON p.id = c.creator_id
      WHERE s.id = ? AND s.token_hash = ? AND (s.profile_id IS NULL OR s.profile_id = ?)
        AND (a.profile_id IS NULL OR a.profile_id = ?) AND ${linkVisibleSql()}`)
      .bind((await params).id, await sha256(token), identity.profileId, identity.profileId)
      .first<{ id: string; slug: string }>();
    if (!session) return json({ error: 'This result is not available to publish' }, 404);
    // Conditional update is the ownership claim. Concurrent claims cannot steal it.
    const result = await db().prepare(`UPDATE challenge_attempts SET profile_id = ?, published = 1
      WHERE id = ? AND (profile_id IS NULL OR profile_id = ?)`)
      .bind(identity.profileId, session.id, identity.profileId).run();
    if (result.meta.changes !== 1) return json({ error: 'This result belongs to another profile' }, 409);
    return json({ slug: session.slug, url: `https://typearchy.com/a/${session.slug}` });
  } catch (error) { return errorResponse(error); }
}
