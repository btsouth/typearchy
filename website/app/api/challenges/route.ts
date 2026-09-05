import { authenticateDevice, db, enforceRateLimit, errorResponse, json, randomCode, readJson, sha256 } from '../../lib/db';
import { parseChallenge } from '../../lib/challengeContract';
import { isCuratedPassage } from '../../lib/curatedPassages';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect your profile to publish a challenge' }, 401);
    await enforceRateLimit(`challenge-create:${identity.profileId}`, 12, 3600);
    const challenge = parseChallenge(await readJson(request));
    const contentHash = await sha256(JSON.stringify({ passage: challenge.passage, rules: challenge.rules, language: challenge.language }));
    const slug = randomCode(12).toLowerCase();
    await db().prepare(`INSERT INTO challenges
      (id, slug, creator_id, title, passage, language, attribution, rules_json, content_hash, visibility, created_at, moderation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), slug, identity.profileId, challenge.title, challenge.passage,
        challenge.language, challenge.attribution, JSON.stringify(challenge.rules), contentHash,
        challenge.visibility, Date.now(), isCuratedPassage(challenge) ? 'approved' : 'pending').run();
    return json({ slug, url: `https://typearchy.com/c/${slug}`, reviewPending: !isCuratedPassage(challenge) }, 201);
  } catch (error) { return errorResponse(error); }
}
