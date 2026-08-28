export const PUBLIC_MODES = ['sprint', 'daily', 'quote', 'shell', 'code', 'drill'] as const;

const RESERVED_HANDLES = new Set([
  'admin', 'api', 'connect', 'demo', 'help', 'moderator', 'recover', 'root',
  'security', 'settings', 'support', 'system', 'typearchy', 'www',
]);

export type PublishedRunInput = {
  schemaVersion: 1;
  contentVersion: string;
  mode: typeof PUBLIC_MODES[number];
  challengeKey: string;
  target: string;
  duration: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  errors: number;
  pace: number[];
  timestamp: string;
};

function finiteNumber(value: unknown, minimum: number, maximum: number, name: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum)
    throw new Error(`Invalid ${name}`);
  return Math.round(number * 10) / 10;
}

function boundedString(value: unknown, maximum: number, name: string) {
  const text = String(value ?? '').trim();
  if (!text || text.length > maximum) throw new Error(`Invalid ${name}`);
  return text;
}

export function validateHandle(input: unknown) {
  const handle = String(input ?? '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9_-]{1,18}[a-z0-9])$/.test(handle))
    throw new Error('Use 3 to 20 letters, numbers, underscores, or hyphens');
  if (RESERVED_HANDLES.has(handle)) throw new Error('That handle is reserved');
  return handle;
}

export function validateDeviceLabel(input: unknown) {
  const label = String(input ?? '').trim().replace(/\s+/g, ' ');
  return label.slice(0, 40) || 'Omarchy device';
}

export function validateToken(input: unknown) {
  const token = String(input ?? '');
  if (!/^tpy_[a-f0-9]{64}$/.test(token)) throw new Error('Invalid device token');
  return token;
}

export function validateConnectionCode(input: unknown) {
  const code = String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) throw new Error('Invalid or expired connection code');
  return code;
}

export function parsePublishedRun(input: unknown): PublishedRunInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid run');
  const value = input as Record<string, unknown>;
  const mode = String(value.mode ?? '') as PublishedRunInput['mode'];
  if (!PUBLIC_MODES.includes(mode)) throw new Error('This mode cannot be published');
  const pace = Array.isArray(value.pace)
    ? value.pace.slice(0, 180).map((sample) => finiteNumber(sample, 0, 500, 'pace sample'))
    : [];
  if (!pace.length) throw new Error('A pace series is required');
  const timestamp = boundedString(value.timestamp, 40, 'timestamp');
  if (!Number.isFinite(Date.parse(timestamp))) throw new Error('Invalid timestamp');
  return {
    schemaVersion: 1,
    contentVersion: boundedString(value.contentVersion || 'unknown', 40, 'content version'),
    mode,
    challengeKey: boundedString(value.challengeKey, 180, 'challenge key'),
    target: boundedString(value.target || 'standard', 80, 'target'),
    duration: Math.round(finiteNumber(value.duration, 1, 3600, 'duration')),
    wpm: finiteNumber(value.wpm, 1, 400, 'WPM'),
    rawWpm: finiteNumber(value.rawWpm, 1, 500, 'raw WPM'),
    accuracy: finiteNumber(value.accuracy, 0, 100, 'accuracy'),
    consistency: finiteNumber(value.consistency, 0, 100, 'consistency'),
    errors: Math.round(finiteNumber(value.errors, 0, 10000, 'errors')),
    pace,
    timestamp: new Date(timestamp).toISOString(),
  };
}

export function profileSummary(runs: Array<{ wpm: number; accuracy: number; mode: string; target: string; pinned_at?: number | null }>) {
  const best = runs.reduce((maximum, run) => Math.max(maximum, Number(run.wpm) || 0), 0);
  const averageAccuracy = runs.length
    ? runs.reduce((total, run) => total + (Number(run.accuracy) || 0), 0) / runs.length
    : 0;
  const codeBest = runs.filter((run) => run.mode === 'code')
    .reduce((maximum, run) => Math.max(maximum, Number(run.wpm) || 0), 0);
  return {
    best: Math.round(best),
    averageAccuracy: Math.round(averageAccuracy * 10) / 10,
    codeBest: Math.round(codeBest),
    pinned: runs.filter((run) => run.pinned_at != null).length,
  };
}

export function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1)
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}
