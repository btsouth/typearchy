export function paceAt(samples: number[], progress: number) {
  if (!samples.length) return 0;
  const bounded = Math.max(0, Math.min(1, progress));
  const position = bounded * (samples.length - 1);
  const lower = Math.floor(position);
  const upper = Math.min(samples.length - 1, lower + 1);
  const mix = position - lower;
  return Math.round(samples[lower] + (samples[upper] - samples[lower]) * mix);
}

export function cumulativeWordsAt(samples: number[], progress: number, durationSeconds: number) {
  if (!samples.length || durationSeconds <= 0) return 0;
  const bounded = Math.max(0, Math.min(1, progress));
  const scaled = bounded * samples.length;
  const complete = Math.floor(scaled);
  const partial = scaled - complete;
  const secondsPerSample = durationSeconds / samples.length;
  let words = 0;
  for (let index = 0; index < complete; index += 1) words += samples[index] / 60 * secondsPerSample;
  if (complete < samples.length) words += samples[complete] / 60 * secondsPerSample * partial;
  return words;
}

export function racePosition(words: number, finishWords: number) {
  if (finishWords <= 0) return 0;
  return Math.max(0, Math.min(97, words / finishWords * 97));
}

export function replayProgress(originMs: number, nowMs: number, durationMs: number) {
  if (durationMs <= 0) return 1;
  return Math.max(0, Math.min(1, (nowMs - originMs) / durationMs));
}
