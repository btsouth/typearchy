// Render in a separate offscreen Quickshell process with isolated theme fixtures.
// Never loads or restarts the user's desktop shell.
import { mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { competitionReplay } from '../website/app/competitionEngine.js';
const directory = mkdtempSync(join(tmpdir(),'typearchy-qml-'));
const passage = 'def greeting(name)\n  puts "Hello, #{name}!"\nend';
const rules = { version:'competition-1',finish:'passage',correction:'required',autoIndent:true };
const events = Array.from(passage.replace('\n  ','\n')).map((text,index)=>({type:'input',text,at:index*100}));
const expected = competitionReplay(passage,rules,events);
try {
  for (const file of ['NativeChallenge.qml','CompetitionEngine.js','TypearchyModel.js','LearningEngine.js']) cpSync(new URL('../'+file,import.meta.url), join(directory,file));
  cpSync(new URL('./qml/Commons',import.meta.url),join(directory,'Commons'),{recursive:true});
  writeFileSync(join(directory,'fixture.json'),JSON.stringify({passage,rules,events,expected}));
  writeFileSync(join(directory,'shell.qml'), `import QtQuick
import Quickshell
import Quickshell.Io
import "CompetitionEngine.js" as Engine
Window {
  width: 1100; height: 850; visible: true
  NativeChallenge { id: challenge; anchors.fill: parent; helper: "/bin/false"; stateDir: ${JSON.stringify(directory)} }
  FileView { id: fixture; path: ${JSON.stringify(join(directory,'fixture.json'))}
    onLoaded: {
      var data = JSON.parse(text())
      var result = Engine.competitionReplay(data.passage, data.rules, data.events)
      if (JSON.stringify(result) !== JSON.stringify(data.expected)) { console.error("NATIVE_PARITY_FAILED"); Qt.exit(1); return }
      challenge.challenge = { title: "Native Ruby test", passage: data.passage, language: "ruby", handle: "preview", rules: data.rules, attribution: "Test fixture" }
      challenge.entered = "def greeting(name)\\n  puts"
      challenge.phase = "ready"
      console.log("NATIVE_PARITY_PASSED")
      finished.start()
    }
  }
  Timer { id: finished; interval: 300; onTriggered: Qt.quit() }
}`);
  const result = spawnSync('quickshell',['--no-color','--path',join(directory,'shell.qml')],{env:{...process.env,QT_QPA_PLATFORM:'offscreen',QSG_RHI_BACKEND:'software'},encoding:'utf8',timeout:15000});
  const output = result.stdout + result.stderr;
  assert.equal(result.status,0,output);
  assert.match(output,/NATIVE_PARITY_PASSED/);
  assert.doesNotMatch(output,/ReferenceError|TypeError|Unable to load|Cannot assign|not a type|Binding loop/i);
  console.log('Native challenge rendered offscreen; Ruby replay matches the server exactly.');
} finally { rmSync(directory,{recursive:true,force:true}); }
