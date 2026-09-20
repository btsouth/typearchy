import { parseArguments, readRepositoryFile, writeGenerated } from './sync-lib.mjs';

// The pack is evaluated from the same body the browser imports, so the JSON cannot describe a
// corpus the engine does not have.
const contentBody = readRepositoryFile('Content.js').replace(/^\.pragma library\s*/, '');
const pack = new Function(
  `${contentBody}\nreturn { words: WORDS, dailyPassages: DAILY_PASSAGES, quotes: QUOTES };`,
)();
writeGenerated('website/app/contentPack.json', JSON.stringify(pack, null, 2) + '\n', parseArguments(process.argv));
