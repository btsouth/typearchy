import { COMPETITION_VERSION, competitionState, competitionReplay, MAX_EVENTS } from '../competitionEngine.js';
import { ClientError } from './clientError.ts';

export const CHALLENGE_LANGUAGES = ['prose', 'ruby', 'javascript', 'typescript', 'python', 'rust', 'bash', 'go', 'text'] as const;
export type ChallengeLanguage = typeof CHALLENGE_LANGUAGES[number];
export type ChallengeRules = { version: string; finish: 'passage'; correction: 'required'; autoIndent: boolean };
export type AttemptEvent = { at: number; type: 'input'; text: string } | { at: number; type: 'backspace' | 'word' };
export type ChallengeInput = {
  title: string; passage: string; language: ChallengeLanguage; attribution: string;
  visibility: 'public' | 'unlisted'; rules: ChallengeRules;
};

function text(input: unknown, min: number, max: number, name: string) {
  if (typeof input !== 'string') throw new ClientError(`Invalid ${name}`);
  const value = input.normalize('NFC').trim();
  if (value.length < min || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) throw new ClientError(`Invalid ${name}`);
  return value;
}

export function parseChallenge(input: unknown): ChallengeInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ClientError('Invalid challenge');
  const value = input as Record<string, unknown>;
  const language = value.language as ChallengeLanguage;
  if (!CHALLENGE_LANGUAGES.includes(language)) throw new ClientError('Choose a supported language');
  if (typeof value.passage !== 'string') throw new ClientError('Add a passage');
  const passage = value.passage.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, '  ').trimEnd();
  if (typeof value.autoIndent !== 'boolean') throw new ClientError('Choose an indentation rule');
  if (value.visibility !== 'public' && value.visibility !== 'unlisted') throw new ClientError('Choose public or unlisted');
  const rules: ChallengeRules = { version: COMPETITION_VERSION, finish: 'passage', correction: 'required', autoIndent: value.autoIndent };
  try { competitionState(passage, rules); } catch { throw new ClientError('Use 40 to 4,000 characters of readable text'); }
  return { title: text(value.title, 3, 80, 'title'), passage, language,
    attribution: text(value.attribution ?? '', 0, 240, 'attribution'), visibility: value.visibility, rules };
}

export function parseRecording(input: unknown): AttemptEvent[] {
  if (!Array.isArray(input) || !input.length || input.length > MAX_EVENTS) throw new ClientError('Invalid recording');
  return input.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !Number.isInteger(value.at)) throw new ClientError('Invalid recording');
    if (value.type === 'input' && typeof value.text === 'string' && Array.from(value.text).length === 1)
      return { at: value.at, type: 'input', text: value.text };
    if (value.type === 'backspace' || value.type === 'word') return { at: value.at, type: value.type };
    throw new ClientError('Invalid input event');
  });
}

export function validateAttempt(passage: string, rules: ChallengeRules, events: AttemptEvent[], sessionAgeMs: number) {
  try {
    const result = competitionReplay(passage, rules, events);
    if (result.durationMs > sessionAgeMs + 1000) throw new Error('Attempt timing does not match its session');
    return result;
  } catch (error) { throw new ClientError(error instanceof Error ? error.message : 'Invalid attempt'); }
}
