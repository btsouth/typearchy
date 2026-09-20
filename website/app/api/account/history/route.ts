import { authenticateDevice, db, enforceRateLimit, errorResponse, json, readJson } from '../../../lib/db';
import { ACCOUNT_HISTORY_KEPT, parseSyncedRuns } from '../../../lib/accountHistory';

export const dynamic = 'force-dynamic';

// A sync carries a batch of runs, so this route's body is larger than the default cap. The batch size
// and this cap have to agree: 200 runs of aggregate fields stay well inside it.
const SYNC_BODY_LIMIT = 256 * 1024;

// Keeping practice history on the account is explicit: nothing is uploaded until the player asks, and
// the rows carry only the aggregate fields PROFILE_CONTRACT.md allows.
export async function POST(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect your profile first' }, 401);
    await enforceRateLimit(`history-sync:${identity.profileId}`, 60, 3600);
    const body = await readJson(request, SYNC_BODY_LIMIT) as { runs?: unknown };
    const runs = parseSyncedRuns(body.runs);
    let added = 0;
    if (runs.length) {
      const results = await db().batch(runs.map((run) => db().prepare(`INSERT INTO account_runs
        (id, profile_id, client_id, schema_version, content_version, mode, challenge_key, target, duration,
         wpm, raw_wpm, accuracy, consistency, errors, pace_json, interrupted, completed, public_slug, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(profile_id, client_id) DO NOTHING`)
        .bind(`${identity.profileId}:${run.clientId}`, identity.profileId, run.clientId, run.schemaVersion,
          run.contentVersion, run.mode, run.challengeKey, run.target, run.duration, run.wpm, run.rawWpm,
          run.accuracy, run.consistency, run.errors, JSON.stringify(run.pace), Number(run.interrupted),
          Number(run.completed), run.publicSlug, run.createdAt)));
      added = results.reduce((total, result) => total + Number((result.meta as { changes?: number } | undefined)?.changes ?? 0), 0);
    }
    // Keep the newest rows, and never drop a row that links to a public result. The order matches the
    // read path, so which rows fall off the end is predictable.
    await db().prepare(`DELETE FROM account_runs WHERE profile_id = ? AND public_slug IS NULL
      AND id NOT IN (SELECT id FROM account_runs WHERE profile_id = ? ORDER BY created_at DESC, client_id DESC LIMIT ?)`)
      .bind(identity.profileId, identity.profileId, ACCOUNT_HISTORY_KEPT).run();
    const kept = await db().prepare('SELECT COUNT(*) AS count FROM account_runs WHERE profile_id = ?')
      .bind(identity.profileId).first<{ count: number }>();
    return json({ added, kept: kept?.count ?? 0 });
  } catch (error) { return errorResponse(error); }
}

export async function GET(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect your profile first' }, 401);
    const cursor = new URL(request.url).searchParams.get('cursor');
    let before = '~'; let beforeId = '\uffff';
    if (cursor) {
      try {
        const values = JSON.parse(cursor);
        if (!Array.isArray(values) || typeof values[0] !== 'string' || values[0].length > 40 || typeof values[1] !== 'string' || values[1].length > 200) throw new Error();
        before = values[0]; beforeId = values[1];
      } catch { return json({ error: 'Invalid history cursor' }, 400); }
    }
    const rows = await db().prepare(`SELECT client_id, schema_version, content_version, mode, challenge_key,
        target, duration, wpm, raw_wpm, accuracy, consistency, errors, pace_json, interrupted, completed,
        public_slug, created_at
      FROM account_runs WHERE profile_id = ?
      AND (created_at < ? OR (created_at = ? AND client_id < ?))
      ORDER BY created_at DESC, client_id DESC LIMIT 101`)
      .bind(identity.profileId, before, before, beforeId).all();
    const page = rows.results.slice(0, 100);
    const last = page.at(-1) as { created_at: string; client_id: string } | undefined;
    // The response mirrors the sync payload, so a device can read back exactly what it sent.
    const runs = page.map((row) => {
      const record = row as Record<string, unknown>;
      return {
        clientId: String(record.client_id),
        schemaVersion: Number(record.schema_version),
        contentVersion: String(record.content_version),
        mode: String(record.mode),
        challengeKey: String(record.challenge_key),
        target: String(record.target),
        duration: Number(record.duration),
        wpm: Number(record.wpm),
        rawWpm: Number(record.raw_wpm),
        accuracy: Number(record.accuracy),
        consistency: Number(record.consistency),
        errors: Number(record.errors),
        pace: JSON.parse(String(record.pace_json)) as number[],
        interrupted: Number(record.interrupted) === 1,
        completed: Number(record.completed) === 1,
        publicSlug: record.public_slug === null ? null : String(record.public_slug),
        createdAt: String(record.created_at),
      };
    });
    return json({
      runs,
      nextCursor: rows.results.length > 100 && last ? JSON.stringify([last.created_at, last.client_id]) : null,
    });
  } catch (error) { return errorResponse(error); }
}
