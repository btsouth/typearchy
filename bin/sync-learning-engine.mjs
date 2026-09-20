import { parseArguments, readRepositoryFile, renderModule, writeGenerated } from './sync-lib.mjs';

const contents = renderModule({
  source: readRepositoryFile('LearningEngine.js'),
  sourceFile: 'LearningEngine.js',
  generator: 'bin/sync-learning-engine.mjs',
  exportNames: ['learningState', 'learningLabel', 'learningNormalize', 'learningRecord', 'learningProfile'],
});
writeGenerated('website/app/learningEngine.js', contents, parseArguments(process.argv));
