import { readFileSync, writeFileSync } from 'node:fs';
const source = readFileSync(new URL('../LearningEngine.js', import.meta.url), 'utf8').replace(/^\.pragma library\s*/, '');
writeFileSync(new URL('../website/app/learningEngine.js', import.meta.url), '// Generated from LearningEngine.js by bin/sync-learning-engine.mjs.\n' + source + '\nexport { learningState, learningLabel, learningNormalize, learningRecord, learningProfile }\n');
