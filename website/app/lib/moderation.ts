import { env } from 'cloudflare:workers';
import { authenticateDevice } from './db';
import { ClientError } from './clientError';

export async function requireModerator(request: Request) {
  const identity = await authenticateDevice(request);
  const allowed = String((env as unknown as { TYPEARCHY_MODERATOR_PROFILE_IDS?: string }).TYPEARCHY_MODERATOR_PROFILE_IDS || '')
    .split(',').map(value => value.trim()).filter(Boolean);
  if (!identity || !allowed.includes(identity.profileId)) throw new ClientError('Moderator access required', 403);
  return identity;
}
