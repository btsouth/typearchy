import { authenticateDevice, db, enforceRateLimit, errorResponse, json, randomCode, randomHex, sha256 } from '../../../lib/db';

export const dynamic = 'force-dynamic';

// An authenticated device hands a browser a one-time, short-lived code. The
// browser trades it for its own device token, so a second device connects
// without the recovery code and without revoking anything.
export async function POST(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect your profile first' }, 401);
    await enforceRateLimit(`browser-grant:${identity.profileId}`, 10, 3600);
    const now = Math.floor(Date.now() / 1000);
    const database = db();
    await database.prepare('DELETE FROM connections WHERE expires_at <= ?').bind(now).run();
    let code = '';
    for (let attempt = 0; attempt < 4; attempt += 1) {
      code = randomCode(8);
      try {
        // The browser's token is minted when it adopts the code; this hash only satisfies the unique column.
        await database.prepare(`INSERT INTO connections (code, token_hash, kind, label, profile_id, created_at, expires_at)
          VALUES (?, ?, 'browser', 'Web browser', ?, ?, ?)`)
          .bind(code, await sha256(`grant:${randomHex(32)}`), identity.profileId, now, now + 600).run();
        break;
      } catch (error) { if (attempt === 3) throw error; }
    }
    return json({ status: 'pending', code, handle: identity.handle, url: `https://typearchy.com/connect?browser=${code}`, expiresIn: 600 }, 201);
  } catch (error) { return errorResponse(error); }
}

export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get('code') || '';
    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) return json({ error: 'Invalid or expired connection code' }, 404);
    const row = await db().prepare(`SELECT p.handle FROM connections c JOIN profiles p ON p.id = c.profile_id
      WHERE c.code = ? AND c.kind = 'browser' AND c.claimed_at IS NULL AND c.expires_at > ?`)
      .bind(code, Math.floor(Date.now() / 1000)).first<{ handle: string }>();
    if (!row) return json({ error: 'This connection code expired. Start again from the app.' }, 404);
    return json({ handle: row.handle });
  } catch (error) { return errorResponse(error); }
}
