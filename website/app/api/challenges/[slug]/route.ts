import { authenticateDevice, db, errorResponse, json, readJson } from '../../../lib/db';
import { challengeGhost, challengeStandings, findChallenge, publicChallenge } from '../../../lib/challenges';

export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const identity = await authenticateDevice(request);
    const challenge = await findChallenge((await params).slug, identity?.profileId);
    if (!challenge) return json({ error: 'Challenge not found' }, 404);
    const [ghost, standings] = await Promise.all([challengeGhost(challenge.id, new URL(request.url).searchParams.get('race') || undefined), challengeStandings(challenge.id)]);
    return json({ challenge: publicChallenge(challenge), ghost, standings });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect your profile first' }, 401);
    const body = await readJson(request) as { visibility?: string };
    if (!['public', 'unlisted', 'hidden'].includes(body.visibility || '')) return json({ error: 'Choose a valid visibility' }, 400);
    const result = await db().prepare('UPDATE challenges SET visibility = ? WHERE slug = ? AND creator_id = ?')
      .bind(body.visibility, (await params).slug, identity.profileId).run();
    if (!result.meta.changes) return json({ error: 'Challenge not found' }, 404);
    return json({ visibility: body.visibility });
  } catch (error) { return errorResponse(error); }
}
