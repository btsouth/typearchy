import { parseArguments, readRepositoryFile, renderModule, writeGenerated } from './sync-lib.mjs';

const contents = renderModule({
  source: readRepositoryFile('CompetitionEngine.js'),
  sourceFile: 'CompetitionEngine.js',
  generator: 'bin/sync-competition-engine.mjs',
  exportNames: [
    'COMPETITION_VERSION', 'MAX_EVENTS', 'MAX_DURATION_MS', 'competitionRules', 'competitionState',
    'competitionStep', 'competitionResult', 'competitionReplay', 'competitionPosition',
  ],
});
writeGenerated('website/app/competitionEngine.js', contents, parseArguments(process.argv));
