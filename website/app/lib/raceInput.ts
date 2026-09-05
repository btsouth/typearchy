export function raceProgress(correct: number, total: number, complete: boolean) {
  return complete ? 100 : Math.min(99, Math.floor(correct * 100 / Math.max(1, total)));
}

export function firstMistake(passage: string[], typed: string[]) {
  return typed.findIndex((char, index) => char !== passage[index]);
}

// Tab is an indentation aid, never a literal tab (challenge passages use spaces).
// Auto-indented races need no additional indentation. Mid-line Tab is a no-op.
export function tabIndent(passage: string[], typed: string[], autoIndent: boolean) {
  if (autoIndent || firstMistake(passage, typed) !== -1) return '';
  const index = typed.length;
  const start = passage.lastIndexOf('\n', index - 1) + 1;
  if (passage.slice(start, index).some(char => char !== ' ')) return '';
  let count = 0;
  while (passage[index + count] === ' ' && count < 4) count++;
  return ' '.repeat(count);
}
