import { readFileSync, writeFileSync } from 'node:fs';
const corpus = JSON.parse(readFileSync(new URL('../corpus/prose.json', import.meta.url), 'utf8'));
writeFileSync(new URL('../website/app/practicePassages.json', import.meta.url), JSON.stringify(corpus, null, 2) + '\n');
writeFileSync(new URL('../PracticePassages.js', import.meta.url), '.pragma library\n\n// Generated from corpus/prose.json by bin/sync-practice-passages.mjs.\nvar PASSAGES = ' + JSON.stringify(corpus.map(item => item.passage), null, 2) + '\n');
