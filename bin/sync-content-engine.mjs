import { parseArguments, readRepositoryFile, renderModule, writeGenerated } from './sync-lib.mjs';

const contents = renderModule({
  source: readRepositoryFile('ContentEngine.js'),
  sourceFile: 'ContentEngine.js',
  generator: 'bin/sync-content-engine.mjs',
  exportNames: ['VERSION', 'generateCode', 'generateShell', 'generateWords', 'generateProse', 'generateQuoteRelay'],
});
writeGenerated('website/app/contentEngine.js', contents, parseArguments(process.argv));
