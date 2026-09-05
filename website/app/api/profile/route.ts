import { authenticateDevice, db, errorResponse, json, readJson } from '../../lib/db';
import { ClientError } from '../../lib/clientError';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Device is not connected' }, 401);
    const body = await readJson(request) as Record<string, unknown>;
    const visibility = body.visibility === 'private' ? 'private' : body.visibility === 'public' ? 'public' : null;
    if (!visibility) throw new ClientError('Visibility must be public or private');
    const updated = await db().prepare("UPDATE profiles SET visibility = ?, updated_at = ? WHERE id = ? AND (? = 'private' OR suspended = 0)")
      .bind(visibility, Math.floor(Date.now() / 1000), identity.profileId, visibility).run();
    if (!updated.meta.changes) return json({ error: 'This profile is restricted by moderation. See your account settings for the review note.' }, 403);
    return json({ status: 'connected', handle: identity.handle, profileUrl: `https://typearchy.com/u/${identity.handle}`, visibility });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Device is not connected' }, 401);
    await db().prepare('DELETE FROM profiles WHERE id = ?').bind(identity.profileId).run();
    return json({ status: 'disconnected', deleted: true });
  } catch (error) { return errorResponse(error); }
}
