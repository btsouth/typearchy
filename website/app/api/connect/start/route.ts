import { clientKey, db, enforceRateLimit, errorResponse, json, randomCode, rateLimitResponse, RateLimitError, readJson, sha256 } from '../../../lib/db';
import { validateDeviceLabel, validateToken } from '../../../lib/profileContract';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`connect:${clientKey(request)}`, 10, 3600);
    const body = await readJson(request) as Record<string, unknown>;
    const tokenHash = await sha256(validateToken(body.token));
    const kind = body.kind === 'recover' ? 'recover' : 'connect';
    const label = validateDeviceLabel(body.label);
    const now = Math.floor(Date.now() / 1000);
    const database = db();
    await database.prepare('DELETE FROM connections WHERE expires_at <= ?').bind(now).run();
    let code = '';
    for (let attempt = 0; attempt < 4; attempt += 1) {
      code = randomCode(8);
      try {
        await database.prepare(`INSERT INTO connections
          (code, token_hash, kind, label, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)`)
          .bind(code, tokenHash, kind, label, now, now + 900).run();
        break;
      } catch (error) {
        if (attempt === 3) throw error;
      }
    }
    return json({
      status: 'pending', code,
      verificationUrl: `https://typearchy.com/${kind === 'recover' ? 'recover' : 'connect'}?code=${code}`,
      expiresIn: 900,
    }, 201);
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    return errorResponse(error);
  }
}
