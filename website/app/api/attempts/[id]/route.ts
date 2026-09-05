import { db, errorResponse, json, randomCode, sha256 } from '../../../lib/db';
import { parseResultTheme } from '../../../lib/resultTheme';
import { ClientError } from '../../../lib/clientError';
import { parseRecording, validateAttempt, type ChallengeRules } from '../../../lib/challengeContract';
import { linkVisibleSql } from '../../../lib/challenges';
import { requireSupportedClient } from '../../../lib/clientVersion';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireSupportedClient(request);
    const token = request.headers.get('x-attempt-token') || '';
    if (!/^[a-f0-9]{64}$/.test(token)) return json({ error: 'Attempt session is missing' }, 401);
    const session = await db().prepare(`SELECT s.*, c.passage, c.rules_json FROM attempt_sessions s
      JOIN challenges c ON c.id = s.challenge_id JOIN profiles p ON p.id = c.creator_id
      WHERE s.id = ? AND s.token_hash = ? AND ((${linkVisibleSql()}) OR s.profile_id = c.creator_id)`)
      .bind((await params).id, await sha256(token)).first<{
        id: string; challenge_id: string; profile_id: string | null; created_at: number;
        expires_at: number; completed_at: number | null; passage: string; rules_json: string;
      }>();
    if (!session) return json({ error: 'Attempt session not found' }, 404);
    // Bound actual bytes, including chunked requests, before parsing a recording.
    if (!request.body) throw new ClientError('Missing recording');
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.length;
      if (length > 1_500_000) { await reader.cancel(); throw new ClientError('Recording is too large', 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let body: { events?: unknown; theme?: unknown };
    try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new ClientError('Invalid recording'); }
    const events = parseRecording(body?.events);
    const hash = await sha256(JSON.stringify(events));
    const previous = await db().prepare('SELECT slug, recording_hash FROM challenge_attempts WHERE id = ?')
      .bind(session.id).first<{ slug: string; recording_hash: string }>();
    if (previous) {
      if (previous.recording_hash !== hash) throw new ClientError('This attempt already has a different result', 409);
      return json({ slug: previous.slug, saved: true });
    }
    if (session.expires_at < Date.now()) throw new ClientError('Attempt session expired. Your local result is still available.', 410);
    const score = validateAttempt(session.passage, JSON.parse(session.rules_json) as ChallengeRules, events, Date.now() - session.created_at);
    const slug = randomCode(12).toLowerCase();
    // Raw input is used transiently for validation. Only sanitized progress is retained.
    // The unique session ID makes submission retry-safe, including simultaneous retries.
    await db().batch([
      db().prepare(`INSERT INTO challenge_attempts
        (id, slug, challenge_id, profile_id, duration_ms, wpm, raw_wpm, accuracy, errors,
         characters, progress_json, recording_hash, created_at, theme_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`)
        .bind(session.id, slug, session.challenge_id, session.profile_id, score.durationMs, score.wpm,
          score.rawWpm, score.accuracy, score.errors, score.characters, JSON.stringify(score.progress), hash, Date.now(), JSON.stringify(parseResultTheme(body.theme))),
      db().prepare('UPDATE attempt_sessions SET completed_at = ? WHERE id = ? AND completed_at IS NULL')
        .bind(Date.now(), session.id),
    ]);
    const saved = await db().prepare('SELECT slug, recording_hash FROM challenge_attempts WHERE id = ?')
      .bind(session.id).first<{ slug: string; recording_hash: string }>();
    if (saved?.recording_hash !== hash) throw new ClientError('This attempt already has a different result', 409);
    return json({ slug: saved.slug, saved: true }, 201);
  } catch (error) { return errorResponse(error); }
}
