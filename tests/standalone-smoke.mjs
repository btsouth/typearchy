// Exercise production QML controls in an isolated process, never the user's app.
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const directory = mkdtempSync(join(tmpdir(), 'typearchy-standalone-'));
const source = new URL('../', import.meta.url);
try {
  for (const file of readdirSync(source)) if (/\.(qml|js)$/.test(file)) cpSync(new URL(file, source), join(directory, file));
  for (const folder of ['Commons', 'Ui', 'bin']) cpSync(new URL(folder, source), join(directory, folder), { recursive: true });
  let overlay = readFileSync(join(directory, 'Overlay.qml'), 'utf8')
    .replace('  id: root', '  id: root\n  property alias testInput: keyCatcher\n  property alias testWindow: window')
    .replace(/readonly property string cloudHelper: [^\n]+/, 'readonly property string cloudHelper: "/bin/false"');
  writeFileSync(join(directory, 'Overlay.qml'), overlay);
  writeFileSync(join(directory, 'shell.qml'), `import QtQuick
import Quickshell
import QtTest
ShellRoot {
  TestCase { id: keys; when: false }
  Overlay { id: game; standalone: true; onQuitRequested: { console.log("STANDALONE_PASSED"); Qt.quit() } }
  function check(value, description) { if (!value) throw new Error(description) }
  Timer { interval: 200; running: true; onTriggered: {
    try {
      game.open("{}"); keys.wait(200)
      check(game.opened && !game.testWindow.fullscreen, "normal window opens")
      game.testInput.forceActiveFocus(); keys.keyClick(Qt.Key_F11); keys.wait(50)
      check(game.testWindow.fullscreen, "F11 enables fullscreen")
      keys.keyClick(Qt.Key_F11); keys.wait(50)
      check(!game.testWindow.fullscreen, "F11 restores windowed mode")
      game.mode = "custom"; game.challenge = { available: true, targetKind: "passage", detail: "fixture", challengeKey: "test:standalone" }
      game.prompt = "red red"; game.phase = "ready"; game.testInput.forceActiveFocus()
      keys.keyClick("r"); keys.wait(50)
      check(game.phase === "running", "typing starts practice")
      game.pausePractice(); keys.wait(50)
      var elapsed = game.elapsedMs
      keys.keyClick("x"); keys.wait(100)
      check(game.typedText === "r" && game.elapsedMs === elapsed, "paused input and timer remain unchanged")
      keys.keyClick(Qt.Key_Return); keys.wait(50)
      check(!game.paused, "Enter resumes through production button")
      game.requestClose(); keys.wait(50)
      check(game.confirmClose && game.paused, "closing an active run asks before discarding")
      keys.keyClick(Qt.Key_Return); keys.wait(50)
      check(!game.confirmClose && !game.paused, "Enter keeps playing and dismisses confirmation")
      for (var character of "ed red") keys.keyClick(character, Qt.NoModifier, 10)
      keys.wait(200)
      check(game.phase === "results" && game.currentResult.interrupted, "completed interrupted practice is labelled")
      check(!game.currentResult.personalBest, "paused practice cannot set a best")
      check(!game.statsWriting, "history write completes")
      game.requestClose()
    } catch (error) { console.error(error); Qt.exit(1) }
  } }
}`);
  const result = spawnSync('quickshell', ['--no-color', '--path', join(directory, 'shell.qml')], {
    env: { ...process.env, TYPEARCHY_STATE_DIR: join(directory, 'state'), XDG_DATA_HOME: join(directory, 'data'), QT_QPA_PLATFORM: 'offscreen', QSG_RHI_BACKEND: 'software', TYPEARCHY_QUIET: '1' }, encoding: 'utf8', timeout: 15000
  });
  const output = result.stdout + result.stderr;
  assert.equal(result.status, 0, output);
  assert.match(output, /STANDALONE_PASSED/);
  assert.doesNotMatch(output, /ReferenceError|TypeError|Unable to load|Cannot assign|not a type|Binding loop/i);
  const stats = JSON.parse(readFileSync(join(directory, 'state/desktop/stats.json'), 'utf8'));
  assert.equal(stats.runs.length, 1); assert.equal(stats.runs[0].interrupted, true);
  console.log('Standalone production UI: launch, keyboard pause/resume, close confirmation, completion, persistence, and quit passed.');
} finally { rmSync(directory, { recursive: true, force: true }); }
