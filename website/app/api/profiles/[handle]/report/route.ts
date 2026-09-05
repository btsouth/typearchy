import { authenticateDevice, clientKey, db, enforceRateLimit, errorResponse, json, publicProfile, readJson } from '../../../../lib/db';

export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: Promise<{ handle: string }> }) {
  try {
    await enforceRateLimit(`profile-report:${clientKey(request)}`, 6, 3600);
    const identity = await authenticateDevice(request);
    const profile = await publicProfile((await params).handle);
    if (!profile) return json({ error: 'Profile not found' }, 404);
    const body = await readJson(request) as { reason?: string; detail?: string };
    if (!['vulgar', 'hateful', 'impersonation', 'spam', 'other'].includes(body.reason || '')) return json({ error: 'Choose a reason' }, 400);
    if (body.detail !== undefined && (typeof body.detail !== 'string' || body.detail.length > 1000)) return json({ error: 'Keep details under 1,000 characters' }, 400);
    await db().prepare('INSERT INTO profile_reports (id, profile_id, reporter_id, reason, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), profile.id, identity?.profileId || null, body.reason, body.detail || '', Date.now()).run();
    return json({ received: true }, 201);
  } catch (error) { return errorResponse(error); }
}
