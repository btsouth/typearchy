// Load the full practice component in a separate, offscreen process. State files
// and helpers are redirected in the temporary copy, never in the installed app.
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const directory=mkdtempSync(join(tmpdir(),'typearchy-practice-qml-'));
try {
  for(const file of ['NativeChallenge.qml','CompetitionEngine.js','LearningEngine.js','PracticePassages.js','TypearchyModel.js','Content.js','ContentEngine.js']) cpSync(new URL('../'+file,import.meta.url),join(directory,file));
  for(const folder of ['Commons','Ui']) cpSync(new URL('./qml/'+folder,import.meta.url),join(directory,folder),{recursive:true});
  const overlay=readFileSync(new URL('../Overlay.qml',import.meta.url),'utf8')
    .replace('readonly property string home: Quickshell.env("HOME")','readonly property string home: '+JSON.stringify(directory))
    .replace(/readonly property string cloudHelper: [^\n]+/,'readonly property string cloudHelper: "/bin/false"')
    // Layer-shell needs a real Wayland compositor. Adapt only the window wrapper
    // while loading and exercising the actual practice component below it.
    .replace('  id: root', '  id: root\n  property alias testKeyCatcher: keyCatcher')
    .replace('  PanelWindow {', '  FloatingWindow {\n    implicitWidth: 1280; implicitHeight: 900')
    .replace(/^    anchors \{ top: true; bottom: true; left: true; right: true \}\n/m, '')
    .replace(/^    (exclusionMode:|WlrLayershell\.)[^\n]*\n/gm, '');
  writeFileSync(join(directory,'Overlay.qml'),overlay);
  writeFileSync(join(directory,'shell.qml'),`import QtQuick
import Quickshell
import QtTest
ShellRoot {
  TestCase { id: keys; when: false }
  Overlay { id: game }
  Timer { interval: 200; running: true; repeat: false; onTriggered: {
    game.mode = "custom"; game.challenge = { available: true, targetKind: "passage", detail: "fixture", challengeKey: "test:learning" }
    game.prompt = "red red red red red red red red red red"; game.typedText = ""; game.phase = "ready"
    var input = "xed xed xed red red red red red red red"
    game.opened = true; game.testKeyCatcher.forceActiveFocus()
    keys.wait(100)
    for (var i=0;i<input.length;i++) keys.keyClick(input[i], Qt.NoModifier, 5)
    if (game.phase !== "results" || game.currentResult.learning.keys.r.attempts !== 10 || game.currentResult.learning.keys.r.errors !== 3) { console.error("NATIVE_PRACTICE_FAILED"); Qt.exit(1); return }
    console.log("NATIVE_PRACTICE_PASSED"); finish.start()
  } }
  Timer { id: finish; interval: 200; onTriggered: Qt.quit() }
}`);
  const result=spawnSync('quickshell',['--no-color','--path',join(directory,'shell.qml')],{env:{...process.env,TYPEARCHY_STATE_DIR:join(directory,'state'),XDG_STATE_HOME:join(directory,'state-home'),XDG_DATA_HOME:join(directory,'data'),QT_QPA_PLATFORM:'offscreen',QSG_RHI_BACKEND:'software'},encoding:'utf8',timeout:15000});
  const output=result.stdout+result.stderr;
  assert.equal(result.status,0,output);assert.match(output,/NATIVE_PRACTICE_PASSED/);
  assert.doesNotMatch(output,/ReferenceError|TypeError|Unable to load|Cannot assign|not a type|Binding loop/i);
  console.log('Full native practice component loaded offscreen and processed real Qt keyboard events and retained measured key attempts correctly.');
} finally {rmSync(directory,{recursive:true,force:true});}
