import { authenticateDevice, clientKey, db, enforceRateLimit, errorResponse, json, rateLimitResponse, RateLimitError, readJson } from '../../../lib/db';
import { ClientError } from '../../../lib/clientError';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect a public profile first' }, 401);
    await enforceRateLimit(`run-admin-ip:${clientKey(request)}`, 240, 3600);
    await enforceRateLimit(`run-admin:${identity.profileId}`, 120, 3600);
    const { slug } = await context.params;
    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(slug)) return json({ error: 'Run not found' }, 404);
    const body = await readJson(request) as Record<string, unknown>;
    if (typeof body.pinned !== 'boolean') throw new ClientError('Pinned must be true or false');
    const database = db();
    const run = await database.prepare('SELECT id, pinned_at FROM runs WHERE slug = ? AND profile_id = ?')
      .bind(slug, identity.profileId).first<{ id: string; pinned_at: number | null }>();
    if (!run) return json({ error: 'Run not found' }, 404);
    const now = Math.floor(Date.now() / 1000);
    if (body.pinned) {
      const result = await database.prepare(`UPDATE runs SET pinned_at = ?
        WHERE id = ? AND (pinned_at IS NOT NULL OR
          (SELECT COUNT(*) FROM runs WHERE profile_id = ? AND pinned_at IS NOT NULL) < 3)`)
        .bind(now, run.id, identity.profileId).run();
      if (!result.meta.changes)
        return json({ error: 'Unpin a run before adding another. Profiles allow three pins.' }, 409);
    } else {
      await database.prepare('UPDATE runs SET pinned_at = NULL WHERE id = ?').bind(run.id).run();
    }
    return json({ slug, url: `https://typearchy.com/r/${slug}`, pinned: body.pinned });
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect a public profile first' }, 401);
    await enforceRateLimit(`run-admin-ip:${clientKey(request)}`, 240, 3600);
    await enforceRateLimit(`run-admin:${identity.profileId}`, 120, 3600);
    const { slug } = await context.params;
    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(slug)) return json({ error: 'Run not found' }, 404);
    const result = await db().prepare('DELETE FROM runs WHERE slug = ? AND profile_id = ?')
      .bind(slug, identity.profileId).run();
    if (!result.meta.changes) return json({ error: 'Run not found' }, 404);
    return json({ status: 'deleted', slug });
  } catch (error) {
    if (error instanceof RateLimitError) return rateLimitResponse(error);
    return errorResponse(error);
  }
}
