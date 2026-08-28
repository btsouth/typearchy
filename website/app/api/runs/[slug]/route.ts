import { authenticateDevice, db, errorResponse, json, readJson } from '../../../lib/db';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const identity = await authenticateDevice(request);
    if (!identity) return json({ error: 'Connect a public profile first' }, 401);
    const { slug } = await context.params;
    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(slug)) return json({ error: 'Run not found' }, 404);
    const body = await readJson(request) as Record<string, unknown>;
    if (typeof body.pinned !== 'boolean') throw new Error('Pinned must be true or false');
    const database = db();
    const run = await database.prepare('SELECT id, pinned_at FROM runs WHERE slug = ? AND profile_id = ?')
      .bind(slug, identity.profileId).first<{ id: string; pinned_at: number | null }>();
    if (!run) return json({ error: 'Run not found' }, 404);
    if (body.pinned && run.pinned_at == null) {
      const count = await database.prepare('SELECT COUNT(*) AS count FROM runs WHERE profile_id = ? AND pinned_at IS NOT NULL')
        .bind(identity.profileId).first<{ count: number }>();
      if ((count?.count || 0) >= 3) return json({ error: 'Unpin a run before adding another. Profiles allow three pins.' }, 409);
    }
    const pinnedAt = body.pinned ? Math.floor(Date.now() / 1000) : null;
    await database.prepare('UPDATE runs SET pinned_at = ? WHERE id = ?').bind(pinnedAt, run.id).run();
    return json({ slug, url: `https://typearchy.com/r/${slug}`, pinned: body.pinned });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const identity = await authenticateDevice(request);
  if (!identity) return json({ error: 'Connect a public profile first' }, 401);
  const { slug } = await context.params;
  const result = await db().prepare('DELETE FROM runs WHERE slug = ? AND profile_id = ?')
    .bind(slug, identity.profileId).run();
  if (!result.meta.changes) return json({ error: 'Run not found' }, 404);
  return json({ status: 'deleted', slug });
}
