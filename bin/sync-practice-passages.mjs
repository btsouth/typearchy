import { parseArguments, readRepositoryFile, writeGenerated } from './sync-lib.mjs';

const corpus = JSON.parse(readRepositoryFile('corpus/prose.json'));
const { check } = parseArguments(process.argv);
writeGenerated('website/app/practicePassages.json', JSON.stringify(corpus, null, 2) + '\n', { check });
writeGenerated('PracticePassages.js', '.pragma library\n\n// Generated from corpus/prose.json by bin/sync-practice-passages.mjs.\nvar PASSAGES = ' +
  JSON.stringify(corpus.map((item) => item.passage), null, 2) + '\n', { check });
