import { authenticateDevice, db, json } from '../../lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request) {
  const identity = await authenticateDevice(request);
  if (!identity) return json({ error: 'Device is not connected' }, 401);
  await db().prepare('DELETE FROM profiles WHERE id = ?').bind(identity.profileId).run();
  return json({ status: 'disconnected', deleted: true });
}
