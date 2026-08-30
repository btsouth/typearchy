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
    await db().prepare('UPDATE profiles SET visibility = ?, updated_at = ? WHERE id = ?')
      .bind(visibility, Math.floor(Date.now() / 1000), identity.profileId).run();
    return json({ status: 'connected', handle: identity.handle, profileUrl: `https://typearchy.com/u/${identity.handle}`, visibility });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const identity = await authenticateDevice(request);
  if (!identity) return json({ error: 'Device is not connected' }, 401);
  await db().prepare('DELETE FROM profiles WHERE id = ?').bind(identity.profileId).run();
  return json({ status: 'disconnected', deleted: true });
}
