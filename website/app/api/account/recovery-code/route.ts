import { authenticateDevice, db, enforceRateLimit, errorResponse, json, randomHex, sha256 } from '../../../lib/db';

export const dynamic = 'force-dynamic';

// Replace a lost recovery code from a device that is already connected. Other
// devices stay connected; only the old code stops working.
export async function POST(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect your profile first' }, 401);
    await enforceRateLimit(`recovery-rotate:${identity.profileId}`, 6, 3600);
    const recoveryCode = `tpy_recovery_${randomHex(18)}`;
    const now = Math.floor(Date.now() / 1000);
    await db().prepare('UPDATE profiles SET recovery_hash = ?, recovery_rotated_at = ?, updated_at = ? WHERE id = ?')
      .bind(await sha256(recoveryCode), now, now, identity.profileId).run();
    return json({ recoveryCode, rotatedAt: now });
  } catch (error) { return errorResponse(error); }
}
