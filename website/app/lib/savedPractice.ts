import { sharedChallengeFromKey, type SharedChallenge } from './sharedPractice';
import type { PracticeRun } from './practiceHistory';
export function savedPractice(run: PracticeRun): SharedChallenge | null {
  const reconstructed = sharedChallengeFromKey(run.challengeKey);
  if (!run.passage) return reconstructed?.version === run.engineVersion ? reconstructed : null;
  return {
    mode: run.mode, duration: reconstructed?.duration || Number(run.target.match(/(15|30|60) SEC/)?.[1]) || 30,
    sprintStyle: run.sprintStyle || 'prose', language: reconstructed?.language || 'javascript',
    inputMode: reconstructed?.inputMode, target: run.target, prompt: run.passage,
    key: run.challengeKey, version: run.engineVersion,
  };
}
export function practiceLabel(run: PracticeRun) {
  const modes: Record<string,string> = {sprint:'Timed typing',words:'Words',daily:'Daily test',quote:'Quotes',shell:'Terminal',code:'Code',focus:'Focused practice',drill:'Mistype drills',custom:'Your own text'};
  return `${modes[run.mode] || run.mode} · ${run.target.toLowerCase().replace('prose','passages').replace('sec','seconds')}`;
}
