import { authenticateDevice, db, errorResponse, json, readJson } from '../../lib/db';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect your profile first' }, 401);
    const devices = await db().prepare(`SELECT id, label, last_used_at FROM devices
      WHERE profile_id = ? AND revoked_at IS NULL ORDER BY last_used_at DESC`).bind(identity.profileId).all();
    const moderation = await db().prepare('SELECT suspended, moderation_note FROM profiles WHERE id = ?').bind(identity.profileId).first();
    return json({ ...moderation, handle: identity.handle, visibility: identity.visibility, currentDevice: identity.deviceId, devices: devices.results });
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect your profile first' }, 401);
    const body = await readJson(request) as { revokeDevice?: string };
    if (typeof body.revokeDevice !== 'string') return json({ error: 'Choose a device' }, 400);
    const result = await db().prepare('UPDATE devices SET revoked_at = ? WHERE id = ? AND profile_id = ? AND revoked_at IS NULL')
      .bind(Math.floor(Date.now() / 1000), body.revokeDevice, identity.profileId).run();
    if (!result.meta.changes) return json({ error: 'Device not found' }, 404);
    return json({ revoked: true, signedOut: body.revokeDevice === identity.deviceId });
  } catch (error) { return errorResponse(error); }
}
