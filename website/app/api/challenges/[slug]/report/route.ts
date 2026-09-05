import { authenticateDevice, clientKey, db, enforceRateLimit, errorResponse, json, readJson } from '../../../../lib/db';
import { findChallenge } from '../../../../lib/challenges';

export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await enforceRateLimit(`report:${clientKey(request)}`, 6, 3600);
    const identity = await authenticateDevice(request);
    const challenge = await findChallenge((await params).slug);
    if (!challenge) return json({ error: 'Challenge not found' }, 404);
    const body = await readJson(request) as { reason?: string; detail?: string };
    if (!['vulgar', 'hateful', 'spam', 'rights', 'other'].includes(body.reason || '')) return json({ error: 'Choose a reason' }, 400);
    if (body.detail !== undefined && (typeof body.detail !== 'string' || body.detail.length > 1000)) return json({ error: 'Keep details under 1,000 characters' }, 400);
    await db().prepare('INSERT INTO content_reports (id, challenge_id, reporter_id, reason, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), challenge.id, identity?.profileId || null, body.reason, body.detail || '', Date.now()).run();
    return json({ received: true }, 201);
  } catch (error) { return errorResponse(error); }
}
