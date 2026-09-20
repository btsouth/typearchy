import { ClientError } from './clientError.ts';
import { PACE_CEILING, PACE_SAMPLE_LIMIT } from '../practiceModel.js';

// Practice history a device keeps on its account: the aggregate fields a run is described by, and
// deliberately nothing else. There is no field here for a prompt, typed text, keystrokes, correction
// timing, or local mistake history, and a payload carrying them has them dropped.

export const ACCOUNT_HISTORY_MODES = ['sprint', 'daily', 'quote', 'shell', 'code', 'drill', 'custom', 'words', 'focus'] as const;
// Newest rows kept per profile. The device's own history stays complete; this is a convenience copy.
export const ACCOUNT_HISTORY_KEPT = 500;
export const ACCOUNT_HISTORY_BATCH = 200;

function boundedNumber(value: unknown, minimum: number, maximum: number, name: string, row: number) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum)
    throw new ClientError(`Row ${row}: invalid ${name}`);
  return Math.round(number * 10) / 10;
}

function boundedInteger(value: unknown, minimum: number, maximum: number, name: string, row: number) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum)
    throw new ClientError(`Row ${row}: invalid ${name}`);
  return number;
}

function boundedText(value: unknown, maximum: number, name: string, row: number, allowEmpty = false) {
  const text = typeof value === 'string' ? value : '';
  if ((!allowEmpty && !text) || text.length > maximum) throw new ClientError(`Row ${row}: invalid ${name}`);
  return text;
}

export type SyncedRun = {
  clientId: string; schemaVersion: number; contentVersion: string; mode: string; challengeKey: string;
  target: string; duration: number; wpm: number; rawWpm: number; accuracy: number; consistency: number;
  errors: number; pace: number[]; interrupted: boolean; completed: boolean; publicSlug: string | null; createdAt: string;
};

// One run from a device, in the same units the app records them: seconds and rawWpm.
export function parseSyncedRun(input: unknown, row: number): SyncedRun {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ClientError(`Row ${row}: not a run`);
  const value = input as Record<string, unknown>;
  const mode = String(value.mode ?? '');
  if (!(ACCOUNT_HISTORY_MODES as readonly string[]).includes(mode)) throw new ClientError(`Row ${row}: invalid mode`);
  const pace = Array.isArray(value.pace) ? value.pace : [];
  if (pace.length > PACE_SAMPLE_LIMIT) throw new ClientError(`Row ${row}: too many pace samples`);
  const createdAt = boundedText(value.createdAt, 40, 'timestamp', row);
  if (!Number.isFinite(Date.parse(createdAt))) throw new ClientError(`Row ${row}: invalid timestamp`);
  const slug = typeof value.publicSlug === 'string' && /^[A-HJ-NP-Z2-9]{8}$/.test(value.publicSlug) ? value.publicSlug : null;
  return {
    clientId: boundedText(value.clientId, 100, 'run id', row),
    schemaVersion: boundedInteger(value.schemaVersion ?? 1, 1, 10, 'schema version', row),
    contentVersion: boundedText(value.contentVersion, 80, 'content version', row, true),
    mode,
    challengeKey: boundedText(value.challengeKey, 500, 'challenge key', row),
    target: boundedText(value.target, 200, 'target', row, true),
    duration: boundedInteger(value.duration ?? 0, 0, 3600, 'duration', row),
    wpm: boundedNumber(value.wpm, 0, 1000, 'WPM', row),
    rawWpm: boundedNumber(value.rawWpm, 0, 2000, 'raw WPM', row),
    accuracy: boundedNumber(value.accuracy, 0, 100, 'accuracy', row),
    consistency: boundedNumber(value.consistency, 0, 100, 'consistency', row),
    errors: boundedInteger(value.errors ?? 0, 0, 100000, 'errors', row),
    pace: pace.map((sample, index) => boundedNumber(sample, 0, PACE_CEILING, `pace sample ${index + 1}`, row)),
    interrupted: value.interrupted === true,
    completed: value.completed !== false,
    publicSlug: slug,
    createdAt: new Date(createdAt).toISOString(),
  };
}

export function parseSyncedRuns(input: unknown): SyncedRun[] {
  if (!Array.isArray(input)) throw new ClientError('Send the runs you want to keep');
  if (input.length > ACCOUNT_HISTORY_BATCH) throw new ClientError(`Send at most ${ACCOUNT_HISTORY_BATCH} runs at a time`);
  return input.map((run, index) => parseSyncedRun(run, index + 1));
}
