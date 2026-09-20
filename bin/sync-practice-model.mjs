import { parseArguments, readRepositoryFile, renderModule, writeGenerated } from './sync-lib.mjs';

// The practice model is the core both clients score and store history with. The browser copy is
// generated from the QML library script so the desktop app and the site cannot drift apart.
// The export list is scanned from the source by tests/practice-model.test.mjs, which fails when a
// declared name is missing here.
const contents = renderModule({
  source: readRepositoryFile('TypearchyModel.js'),
  sourceFile: 'TypearchyModel.js',
  generator: 'bin/sync-practice-model.mjs',
  imports: { Learning: './learningEngine.js' },
  exportNames: [
    'clamp', 'round', 'pad2', 'dateKey', 'localDateKey', 'correctCharacters', 'isCorrectCharacter',
    'eraseInput', 'documentPosition',
    'alignCharacter', 'advanceLineBreaks', 'wordsPerMinute', 'accuracy', 'consistency', 'emptyState',
    'normalizeCounts', 'capCounts', 'normalizedMode', 'fallbackChallengeKey', 'normalizeRun',
    'stateNeedsQuarantine', 'parseState', 'daysBetween', 'recordRun', 'mistakeLabel', 'addMistake',
    'sortedCounts', 'weakKeys', 'drillProfile', 'drillTargetErrors', 'modeBest', 'recentAverage',
    'latestRun', 'updateRunPublication', 'clearRunPublications', 'bestForDate', 'dailyRun',
    'filteredRuns', 'recentTrend', 'bestComparableRun', 'paceAt', 'eraseWordIndex', 'resultAction',
    'paceSparkline', 'shareText', 'runBadge', 'resultStatus', 'comparison', 'nextAction',
    'validBackupNumber', 'mergeHistory', 'compareVersions', 'colorString', 'escapeHtml',
    'renderedPrompt', 'STATE_VERSION', 'MODES', 'MISSING_CHARACTER', 'ASSISTED_CHARACTER',
  ],
});
writeGenerated('website/app/practiceModel.js', contents, parseArguments(process.argv));
