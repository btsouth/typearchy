import { readFileSync, writeFileSync } from 'node:fs';
const source = readFileSync(new URL('../CompetitionEngine.js', import.meta.url), 'utf8')
  .replace(/^\.pragma library\s*/, '');
writeFileSync(new URL('../website/app/competitionEngine.js', import.meta.url),
  '// Generated from CompetitionEngine.js by bin/sync-competition-engine.mjs.\n' + source +
  '\nexport { COMPETITION_VERSION, MAX_EVENTS, MAX_DURATION_MS, competitionRules, competitionState, competitionStep, competitionResult, competitionReplay, competitionPosition }\n');
