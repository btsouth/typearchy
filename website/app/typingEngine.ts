export const MISSING_CHARACTER = '\u0000';
export const ASSISTED_CHARACTER = '\u0001';

export function isCorrectCharacter(promptCharacter: string, typedCharacter: string) {
  return typedCharacter === promptCharacter || typedCharacter === ASSISTED_CHARACTER;
}

export function countCorrectCharacters(prompt: string, typed: string) {
  let count = 0;
  const limit = Math.min(prompt.length, typed.length);
  for (let index = 0; index < limit; index += 1) {
    if (typed[index] === prompt[index]) count += 1;
  }
  return count;
}

export function alignCharacter(prompt: string, typed: string, character: string) {
  const index = typed.length;
  const expected = prompt[index] || '';
  if (!character || !expected) return { text: typed, expected, correct: false };
  if (character === expected) return { text: typed + character, expected, correct: true };
  if (character === prompt[index + 1]) return { text: typed + MISSING_CHARACTER + character, expected, correct: false };
  if (index > 0 && character === prompt[index - 1]) return { text: typed, expected, correct: false };
  return { text: typed + character, expected, correct: false };
}

export function advanceLineBreaks(mode: string, prompt: string, typed: string, character: string) {
  let next = typed;
  const technical = mode === 'shell' || mode === 'code';
  if (technical && character !== '\n') return next;
  while (prompt[next.length] === '\n') next += ASSISTED_CHARACTER;
  if (technical) {
    while (prompt[next.length] === ' ' || prompt[next.length] === '\t') next += ASSISTED_CHARACTER;
  }
  return next;
}

export function eraseInput(typed: string, word: boolean) {
  let next = typed;
  while (next.endsWith(ASSISTED_CHARACTER)) next = next.slice(0, -1);
  if (!word) return next.slice(0, -1);
  let index = next.length;
  while (index > 0 && /\s/.test(next[index - 1])) index -= 1;
  while (index > 0 && !/\s/.test(next[index - 1])) index -= 1;
  return next.slice(0, index);
}
