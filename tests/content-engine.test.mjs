import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const testDirectory = fileURLToPath(new URL('.', import.meta.url));
const desktopPath = join(testDirectory, '..', 'ContentEngine.js');
const webPath = join(testDirectory, '..', '..', 'typearchy-site', 'app', 'contentEngine.js');
const contentPath = join(testDirectory, '..', 'Content.js');
const webPackPath = join(testDirectory, '..', '..', 'typearchy-site', 'app', 'contentPack.json');
const desktopSource = readFileSync(desktopPath, 'utf8');
const desktopBody = desktopSource.replace(/^\.pragma library\s*/, '').trim();
if (existsSync(webPath)) {
  const webBody = readFileSync(webPath, 'utf8')
    .replace(/^\/\/ Generated from[^\n]*\n/, '')
    .replace(/\nexport \{[^\n]+\}\s*$/, '')
    .trim();
  assert.equal(webBody, desktopBody, 'desktop and browser engines must not drift');
}
if (existsSync(webPackPath)) {
  const contentBody = readFileSync(contentPath, 'utf8').replace(/^\.pragma library\s*/, '');
  const desktopPack = new Function(`${contentBody}\nreturn { words: WORDS, dailyPassages: DAILY_PASSAGES, quotes: QUOTES };`)();
  assert.deepEqual(JSON.parse(readFileSync(webPackPath, 'utf8')), desktopPack, 'desktop and browser content packs must not drift');
}

const engine = new Function(`${desktopBody}\nreturn { VERSION, generateCode, generateShell, generateWords, generateProse, generateQuoteRelay };`)();
const scratch = mkdtempSync(join(tmpdir(), 'typearchy-engine-'));

function verify(command, args, source, extension) {
  const path = join(scratch, `challenge-${Math.random().toString(36).slice(2)}.${extension}`);
  writeFileSync(path, source);
  const result = spawnSync(command, [...args, path], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${command} rejected generated ${extension}:\n${result.stderr || result.stdout}`);
}

function execute(language, source) {
  const extension = { bash: 'sh', python: 'py', javascript: 'mjs', rust: 'rs' }[language];
  const path = join(scratch, `runtime-${language}.${extension}`);
  writeFileSync(path, source);
  let result;
  if (language === 'rust') {
    const binary = join(scratch, 'runtime-rust');
    result = spawnSync('rustc', [path, '-o', binary], { encoding: 'utf8' });
    assert.equal(result.status, 0, `rustc rejected executable fixture:\n${result.stderr || result.stdout}`);
    result = spawnSync(binary, [], { encoding: 'utf8' });
  } else {
    const command = { bash: 'bash', python: 'python', javascript: 'node' }[language];
    result = spawnSync(command, [path], { encoding: 'utf8' });
  }
  assert.equal(result.status, 0, `${language} fixture failed at runtime:\n${result.stderr || result.stdout}`);
  assert.ok(result.stdout.trim(), `${language} fixture must produce output`);
}

try {
  const compilers = {
    bash: ['bash', ['-n'], 'sh'],
    python: ['python', ['-m', 'py_compile'], 'py'],
    javascript: ['node', ['--check'], 'mjs'],
    rust: ['rustc', ['--emit', 'metadata', '-o', join(scratch, 'challenge.rmeta')], 'rs'],
  };

  for (const [language, [command, args, extension]] of Object.entries(compilers)) {
    const variants = new Set();
    const families = new Set();
    for (let index = 0; index < 12; index += 1) {
      const challenge = engine.generateCode(language, `compiler-${language}-${index}`, 960);
      assert.ok(challenge.prompt.length >= 960, `${language} challenge is too short`);
      assert.match(challenge.key, new RegExp(`^generated:code:${language}:`));
      assert.equal(engine.generateCode(language, challenge.key, 960).prompt, challenge.prompt, 'code key must reproduce its challenge');
      variants.add(challenge.prompt);
      families.add(challenge.family);
      verify(command, args, challenge.prompt, extension);
    }
    assert.equal(variants.size, 12, `${language} seeds must produce distinct programs`);
    assert.ok(families.size >= 8, `${language} must exercise at least eight structural families`);
    execute(language, engine.generateCode(language, `runtime-${language}`, 960).prompt);
  }

  const shellVariants = new Set();
  for (let index = 0; index < 20; index += 1) {
    const challenge = engine.generateShell(`shell-${index}`, 960);
    assert.ok(challenge.prompt.length >= 960, 'shell challenge is too short');
    assert.equal(engine.generateShell(challenge.key, 960).prompt, challenge.prompt, 'shell key must reproduce its challenge');
    shellVariants.add(challenge.prompt);
    verify('bash', ['-n'], challenge.prompt, 'sh');
  }
  assert.equal(shellVariants.size, 20, 'shell seeds must produce distinct workflows');

  const words = 'a an the shell code typing system cursor steady accuracy terminal punctuation workflow challenge deterministic compiler keyboard practice'.split(' ');
  const wordChallenge = engine.generateWords(words, words.length, 'balanced-words');
  const generatedWords = wordChallenge.prompt.split(' ');
  assert.equal(generatedWords.length, words.length);
  assert.equal(new Set(generatedWords).size, words.length, 'words must not repeat before the corpus is exhausted');
  assert.equal(engine.generateWords(words, words.length, wordChallenge.key).prompt, wordChallenge.prompt, 'word key must reproduce its challenge');
  assert.ok(generatedWords.some((word) => word.length <= 5));
  assert.ok(generatedWords.some((word) => word.length >= 8));

  const passages = [
    'First passage carries enough distinct material to make its placement visible.',
    'Second passage changes the cadence and preserves a clear paragraph boundary.',
    'Third passage completes the requested length without duplicating earlier prose.',
  ];
  const prose = engine.generateProse(passages, 'prose-seed', 120);
  assert.ok(prose.prompt.length >= 120);
  assert.equal(engine.generateProse(passages, prose.key, 120).prompt, prose.prompt, 'prose key must reproduce its challenge');
  assert.equal(new Set(prose.prompt.split('\n\n')).size, prose.prompt.split('\n\n').length);

  const quotes = [
    { author: 'Ada', shortAuthor: 'Ada', text: 'A long quotation needs enough words to exercise sustained rhythm while preserving the exact source material for every person who types it.' },
    { author: 'Grace', shortAuthor: 'Grace', text: 'Another long quotation gives the relay a second substantial segment and prevents the mode from becoming a collection of tiny fragments.' },
    { author: 'Ken', shortAuthor: 'Ken', text: 'Short and exact.' },
    { author: 'Linus', shortAuthor: 'Linus', text: 'A different voice keeps the relay varied.' },
  ];
  const relay = engine.generateQuoteRelay(quotes, 'relay-seed', 4);
  assert.equal(relay.segments.length, 4);
  assert.equal(engine.generateQuoteRelay(quotes, relay.key, 4).prompt, relay.prompt, 'quote key must reproduce its relay');
  assert.equal(new Set(relay.segments.map((segment) => segment.author)).size, 4);
  assert.ok(relay.prompt.includes('\n\n'));

  console.log(`content engine ${engine.VERSION}: compiled 48 programs and validated 20 shell workflows`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
