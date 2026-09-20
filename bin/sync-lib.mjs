// Shared helpers for the mirror generators in this directory (bin/sync-*.mjs).
//
// The desktop clients load the engines as QML library scripts (`.pragma library`), which QML
// resolves by filename and which no bundler understands. The browser gets generated copies of the
// same bodies: the pragma removed, `.import` rewritten as a real ESM import, and a trailing export
// list. One body stays in charge of the behaviour, and --check keeps the copies honest in CI.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const repositoryRoot = new URL('..', import.meta.url);

export const repositoryPath = (path) => new URL(path, repositoryRoot);

export function readRepositoryFile(path) {
  return readFileSync(repositoryPath(path), 'utf8');
}

export function parseArguments(argv) {
  return { check: argv.includes('--check') };
}

// `.import "LearningEngine.js" as Learning` becomes an import of the generated browser copy. The
// caller names that copy, because the generated file is not always the source filename.
export function toModuleBody(source, imports = {}) {
  const importLines = [];
  const body = source
    .replace(/^\.pragma library\s*/, '')
    .replace(/^\.import "([^"\n]+)" as (\w+)\s*$/gm, (_match, file, name) => {
      importLines.push(`import * as ${name} from '${imports[name] || `./${file}`}';`);
      return '';
    })
    .replace(/^\n+/, '');
  return { body, importLines };
}

export function renderModule({ source, sourceFile, generator, exportNames, imports }) {
  const { body, importLines } = toModuleBody(source, imports);
  if (!body.endsWith('\n')) throw new Error(`${sourceFile} must end with a newline`);
  const head = `// Generated from ${sourceFile} by ${generator}.\n` +
    (importLines.length ? `${importLines.join('\n')}\n\n` : '');
  return `${head}${body}\nexport { ${exportNames.join(', ')} }\n`;
}

// Returns 'current', 'stale' or 'written'. In check mode a stale mirror fails the run.
export function writeGenerated(path, contents, { check = false } = {}) {
  const target = repositoryPath(path);
  const current = existsSync(target) ? readFileSync(target, 'utf8') : null;
  if (current === contents) return 'current';
  if (check) {
    console.error(`${path} does not match its generator. Run node bin/sync-mirrors.mjs`);
    process.exitCode = 1;
    return 'stale';
  }
  writeFileSync(target, contents);
  console.log(`wrote ${path}`);
  return 'written';
}
