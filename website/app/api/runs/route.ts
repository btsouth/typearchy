import { authenticateDevice, db, enforceRateLimit, errorResponse, json, randomCode, rateLimitResponse, RateLimitError, readJson } from '../../lib/db';
import { parsePublishedRun } from '../../lib/profileContract';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect a public profile first' }, 401);
    await enforceRateLimit(`publish:${identity.profileId}`, 120, 3600);
    const run = parsePublishedRun(await readJson(request));
    const database = db();
    let slug = '';
    const now = Math.floor(Date.now() / 1000);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      slug = randomCode(8);
      try {
        await database.prepare(`INSERT INTO runs
          (id, slug, profile_id, schema_version, content_version, mode, challenge_key,
           target, duration, wpm, raw_wpm, accuracy, consistency, errors, pace_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(crypto.randomUUID(), slug, identity.profileId, run.schemaVersion, run.contentVersion,
            run.mode, run.challengeKey, run.target, run.duration, run.wpm, run.rawWpm,
            run.accuracy, run.consistency, run.errors, JSON.stringify(run.pace), now).run();
        break;
      } catch (error) {
        if (attempt === 4) throw error;
      }
    }
    return json({ slug, url: `https://typearchy.com/r/${slug}`, profileUrl: `https://typearchy.com/u/${identity.handle}`, pinned: false }, 201);
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    return errorResponse(error);
  }
}
