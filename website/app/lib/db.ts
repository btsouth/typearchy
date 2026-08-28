import { env } from 'cloudflare:workers';

export type ProfileRow = {
  id: string;
  handle: string;
  recovery_hash: string;
  visibility: 'public' | 'private';
  created_at: number;
  updated_at: number;
};

export type DeviceIdentity = {
  deviceId: string;
  profileId: string;
  handle: string;
  visibility: 'public' | 'private';
};

export type RunRow = {
  id: string;
  slug: string;
  profile_id: string;
  schema_version: number;
  content_version: string;
  mode: string;
  challenge_key: string;
  target: string;
  duration: number;
  wpm: number;
  raw_wpm: number;
  accuracy: number;
  consistency: number;
  errors: number;
  pace_json: string;
  created_at: number;
  pinned_at: number | null;
  handle?: string;
};

export function db() {
  return env.DB as D1Database;
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function randomHex(bytes: number) {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function randomCode(length: number, alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export function json(data: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}

export function errorResponse(error: unknown, fallback = 'Request failed', status = 400) {
  const message = error instanceof Error ? error.message : fallback;
  return json({ error: message || fallback }, status);
}

export async function readJson(request: Request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 32_000) throw new Error('Request is too large');
  return request.json() as Promise<unknown>;
}

export function clientKey(request: Request) {
  return request.headers.get('cf-connecting-ip') || 'local';
}

export async function enforceRateLimit(key: string, maximum: number, windowSeconds: number) {
  const database = db();
  const now = Math.floor(Date.now() / 1000);
  const resetAt = now + windowSeconds;
  await database.prepare(`INSERT INTO rate_limits (key, count, reset_at)
    VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN reset_at <= ? THEN 1 ELSE count + 1 END,
      reset_at = CASE WHEN reset_at <= ? THEN ? ELSE reset_at END`)
    .bind(key, resetAt, now, now, resetAt).run();
  const row = await database.prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?')
    .bind(key).first<{ count: number; reset_at: number }>();
  if (row && row.count > maximum) {
    const wait = Math.max(1, row.reset_at - now);
    throw new RateLimitError(wait);
  }
}

export class RateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super('Too many requests. Try again shortly.');
    this.retryAfter = retryAfter;
  }
}

export function rateLimitResponse(error: RateLimitError) {
  return json({ error: error.message }, 429, { 'Retry-After': String(error.retryAfter) });
}

export async function authenticateDevice(request: Request): Promise<DeviceIdentity | null> {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer (tpy_[a-f0-9]{64})$/);
  if (!match) return null;
  const tokenHash = await sha256(match[1]);
  const database = db();
  const row = await database.prepare(`SELECT devices.id AS device_id, profiles.id AS profile_id,
      profiles.handle, profiles.visibility
    FROM devices JOIN profiles ON profiles.id = devices.profile_id
    WHERE devices.token_hash = ? AND devices.revoked_at IS NULL`)
    .bind(tokenHash).first<{ device_id: string; profile_id: string; handle: string; visibility: 'public' | 'private' }>();
  if (!row) return null;
  await database.prepare('UPDATE devices SET last_used_at = ? WHERE id = ?')
    .bind(Math.floor(Date.now() / 1000), row.device_id).run();
  return { deviceId: row.device_id, profileId: row.profile_id, handle: row.handle, visibility: row.visibility };
}

export async function publicProfile(handle: string) {
  return db().prepare(`SELECT id, handle, recovery_hash, visibility, created_at, updated_at
    FROM profiles WHERE handle = ? COLLATE NOCASE AND visibility = 'public'`)
    .bind(handle).first<ProfileRow>();
}

export async function profileRuns(profileId: string, limit = 50) {
  const result = await db().prepare(`SELECT id, slug, profile_id, schema_version, content_version,
      mode, challenge_key, target, duration, wpm, raw_wpm, accuracy, consistency, errors,
      pace_json, created_at, pinned_at
    FROM runs WHERE profile_id = ? ORDER BY created_at DESC LIMIT ?`)
    .bind(profileId, limit).all<RunRow>();
  return result.results;
}

export async function runBySlug(slug: string) {
  return db().prepare(`SELECT runs.id, runs.slug, runs.profile_id, runs.schema_version,
      runs.content_version, runs.mode, runs.challenge_key, runs.target, runs.duration,
      runs.wpm, runs.raw_wpm, runs.accuracy, runs.consistency, runs.errors,
      runs.pace_json, runs.created_at, runs.pinned_at, profiles.handle
    FROM runs JOIN profiles ON profiles.id = runs.profile_id
    WHERE runs.slug = ? AND profiles.visibility = 'public'`)
    .bind(slug).first<RunRow>();
}
