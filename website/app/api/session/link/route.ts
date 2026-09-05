import { authenticateDevice, db, errorResponse, json, readJson } from '../../../lib/db';
import { validateConnectionCode } from '../../../lib/profileContract';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect your profile first' }, 401);
    const body = await readJson(request) as Record<string, unknown>;
    const code = validateConnectionCode(body.code);
    const now = Math.floor(Date.now() / 1000);
    const connection = await db().prepare(`SELECT token_hash, label, profile_id, claimed_at FROM connections
      WHERE code = ? AND kind = 'connect' AND expires_at > ?`)
      .bind(code, now).first<{ token_hash: string; label: string; profile_id: string | null; claimed_at: number | null }>();
    if (!connection) return json({ error: 'Connection code expired. Start again on the device.' }, 404);
    if (connection.claimed_at !== null) {
      if (connection.profile_id !== identity.profileId) return json({ error: 'This code was already connected' }, 409);
      return json({ handle: identity.handle, label: connection.label });
    }
    await db().batch([
      db().prepare(`INSERT INTO devices (id, profile_id, token_hash, label, created_at, last_used_at)
        SELECT ?, ?, token_hash, label, ?, ? FROM connections
        WHERE code = ? AND claimed_at IS NULL AND expires_at > ?`)
        .bind(crypto.randomUUID(), identity.profileId, now, now, code, now),
      db().prepare(`UPDATE connections SET profile_id = ?, claimed_at = ?
        WHERE code = ? AND claimed_at IS NULL AND expires_at > ?`).bind(identity.profileId, now, code, now),
    ]);
    const claimed = await db().prepare('SELECT profile_id FROM connections WHERE code = ?').bind(code).first<{ profile_id: string }>();
    if (claimed?.profile_id !== identity.profileId) return json({ error: 'This code was already connected' }, 409);
    return json({ handle: identity.handle, label: connection.label });
  } catch (error) { return errorResponse(error); }
}
