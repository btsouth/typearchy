import { authenticateDevice, db, json } from '../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const identity = await authenticateDevice(request);
  if (!identity) return json({ error: 'Device is not connected' }, 401);
  return json({ status: 'connected', handle: identity.handle, profileUrl: `https://typearchy.com/u/${identity.handle}` });
}

export async function DELETE(request: Request) {
  const identity = await authenticateDevice(request);
  if (!identity) return json({ error: 'Device is not connected' }, 401);
  await db().prepare('UPDATE devices SET revoked_at = ? WHERE id = ?')
    .bind(Math.floor(Date.now() / 1000), identity.deviceId).run();
  return json({ status: 'disconnected' });
}
