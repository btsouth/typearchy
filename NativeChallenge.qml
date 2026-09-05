pragma ComponentBehavior: Bound
import QtQuick
import QtQuick.Controls as Controls
import Quickshell
import Quickshell.Io
import qs.Commons
import "CompetitionEngine.js" as Engine
import "TypearchyModel.js" as Model

Item {
  id: root
  required property string helper
  required property string stateDir
  signal exitRequested()
  property var challenge: null
  property var ghost: null
  property var standings: []
  property var engine: null
  property var session: null
  property var events: []
  property var result: null
  property string phase: "empty"
  property string action: ""
  property string message: ""
  property string publicUrl: ""
  property string entered: ""
  property real elapsedMs: 0
  property bool saved: false
  readonly property var resultTheme: ({ bg: Color.background.toString(), panel: Qt.lighter(Color.background, 1.12).toString(), ink: Color.foreground.toString(), muted: Color.muted.toString(), accent: Color.accent.toString(), error: Color.urgent.toString() })
  property string pendingSlug: ""
  property string pendingGhost: ""
  readonly property bool busy: worker.running
  readonly property string fontFamily: Style.font.family
  readonly property real ghostPosition: ghost ? Engine.competitionPosition(ghost.progress, elapsedMs) : 0
  readonly property real playerPosition: engine ? engine.correct + engine.assistedCount : 0
  Keys.onPressed: function(event) {
    if (event.key === Qt.Key_Escape) { root.stop(); root.exitRequested(); event.accepted = true }
  }

  function refocus() {
    if (phase === "armed" || phase === "running") catcher.forceActiveFocus()
    else root.forceActiveFocus()
  }

  function open(slug, race) {
    if (phase === "running" || phase === "armed") { refocus(); return }
    if (busy) return
    root.message = ""
    if (!slug) { phase = "empty"; Qt.callLater(function() { linkInput.forceActiveFocus() }); return }
    pendingSlug = slug
    pendingGhost = race || ""
    call("challenge", [slug, race || ""])
  }

  function loadLink() {
    var value = linkInput.text.trim()
    var match = value.match(/^(?:https:\/\/typearchy\.com\/c\/|typearchy:\/\/challenge\/)?([a-z0-9]{12})(?:\?race=([a-z0-9]{12}))?\/?$/)
    if (!match) { message = "Paste a Typearchy challenge link."; return }
    open(match[1], match[2] || "")
  }

  function call(name, args) {
    if (worker.running) return
    action = name
    worker.command = [helper, name].concat(args || [])
    worker.running = true
  }

  function start() {
    if (!challenge || busy) return
    message = "Preparing your race..."
    call("attempt-start", [challenge.slug])
  }

  function apply(type, text) {
    if (phase !== "armed" && phase !== "running") return
    if (phase === "armed" && type !== "input") return
    if (phase === "armed") { clock.restartMs(); elapsedMs = 0; phase = "running" }
    var event = { type: type, at: events.length === 0 ? 0 : Number(clock.elapsedMs()) }
    if (type === "input") event.text = text
    try {
      Engine.competitionStep(engine, event)
      events.push(event)
      entered = engine.typed.join("")
      elapsedMs = event.at
      engine = engine
      if (engine.finishedAt !== null) {
        result = Engine.competitionResult(engine)
        phase = "finished"
        message = "Saving your result..."
        recordingFile.setText(JSON.stringify({ challenge: challenge, session: session, theme: resultTheme, events: events }) + "\n")
      }
    } catch (error) { phase = "ready"; message = String(error.message || error) }
  }

  function stop() { if (phase === "running" || phase === "armed") phase = "ready" }

  ElapsedTimer { id: clock }
  Timer { interval: 50; repeat: true; running: root.visible && root.phase === "running"; onTriggered: {
    root.elapsedMs = Math.min(Engine.MAX_DURATION_MS, Number(clock.elapsedMs()))
    if (Number(clock.elapsedMs()) > Engine.MAX_DURATION_MS) { root.phase = "ready"; root.message = "This attempt reached the 15 minute limit. Start a fresh race when ready." }
  } }
  FileView {
    id: recordingFile
    path: root.stateDir + "/attempt-recording.json"
    atomicWrites: true
    printErrors: false
    onSaved: if (root.phase === "finished" && root.session) root.call("attempt-submit", [root.session.id, path])
    onLoaded: {
      if (!root.challenge || root.phase !== "ready") return
      try {
        var draft = JSON.parse(text())
        if (draft.challenge.slug !== root.challenge.slug || draft.challenge.contentHash !== root.challenge.contentHash) return
        var recoveredEngine = Engine.competitionState(root.challenge.passage, root.challenge.rules)
        draft.events.forEach(function(event) { Engine.competitionStep(recoveredEngine, event) })
        var recovered = Engine.competitionResult(recoveredEngine)
        root.engine = recoveredEngine; root.entered = recoveredEngine.typed.join("")
        root.session = draft.session; root.events = draft.events; root.result = recovered
        root.elapsedMs = recovered.durationMs; root.phase = "finished"; root.saved = false
        root.message = "Recovered your completed result. Retry saving to check its status."
      } catch (error) {}
    }
    onSaveFailed: root.message = "Could not save the recording locally. Keep this result open."
  }
  Process {
    id: worker
    stdout: StdioCollector { id: output; waitForEnd: true }
    onExited: function(exitCode) {
      var response = {}
      try { response = JSON.parse(output.text || "{}") } catch (error) {}
      if (exitCode !== 0 || response.error) { root.message = response.error || "Connection failed. Try again."; return }
      root.message = ""
      if (root.action === "challenge") {
        root.challenge = response.challenge; root.ghost = response.ghost; root.standings = response.standings || []
        root.entered = ""; root.result = null; root.phase = "ready"; root.elapsedMs = 0; root.engine = null
        recordingFile.reload()
      } else if (root.action === "attempt-start") {
        if (response.contentHash !== root.challenge.contentHash) { root.message = "Reload this challenge before racing."; return }
        root.session = response; root.engine = Engine.competitionState(root.challenge.passage, root.challenge.rules)
        root.events = []; root.entered = ""; root.elapsedMs = 0; root.result = null; root.saved = false; root.publicUrl = ""
        root.phase = "armed"; Qt.callLater(function() { catcher.forceActiveFocus() })
      } else if (root.action === "attempt-submit") {
        root.saved = true; root.message = "Validated. Publish your result to join the standings."
      } else if (root.action === "attempt-publish") {
        root.publicUrl = response.url; root.message = "Published. Your result is ready to share."
      }
    }
  }
  Process { id: opener }
  Process { id: copier }

  Rectangle { anchors.fill: parent; color: Color.background }
  Controls.ScrollView {
    anchors.fill: parent
    anchors.margins: Math.max(24, Math.min(root.width * 0.07, 100))
    contentWidth: availableWidth
    Column {
      width: parent.width
      spacing: 24
      Row {
        spacing: 24
        Action { text: "Back to typing"; onClicked: { root.stop(); root.exitRequested() } }
        Action { text: "Browse challenges"; onClicked: { opener.command = ["xdg-open", "https://typearchy.com/challenges"]; opener.running = true } }
      }
      Text { text: "TYPEARCHY / CHALLENGES"; color: Color.accent; font.family: root.fontFamily; font.pixelSize: 16 }
      Text { width: parent.width; text: root.challenge ? root.challenge.title : "A time to beat."; textFormat: Text.PlainText; color: Color.foreground; font.family: root.fontFamily; font.pixelSize: 38; font.bold: true; wrapMode: Text.Wrap }
      Row {
        visible: root.phase === "empty"
        width: parent.width; spacing: 16
        Controls.TextField { id: linkInput; width: parent.width - 180; placeholderText: "https://typearchy.com/c/..."; color: Color.foreground; font.family: root.fontFamily; font.pixelSize: 18; onAccepted: root.loadLink(); background: Rectangle { color: Color.background; border.color: Color.muted } }
        Action { text: root.busy ? "Loading..." : "Open challenge"; enabled: !root.busy; onClicked: root.loadLink() }
      }
      Action { visible: root.phase === "ready"; text: root.busy ? "Preparing..." : "Start challenge"; enabled: !root.busy; onClicked: root.start() }
      Text { visible: root.phase === "ready"; text: "Online attempts send test input and timing for score validation. Only passage progress is kept for replay."; width: parent.width; wrapMode: Text.Wrap; color: Color.muted; font.family: root.fontFamily; font.pixelSize: 16 }
      Text { visible: !!root.challenge; text: root.challenge ? root.challenge.language.toUpperCase() + " / @" + root.challenge.handle + " / Correct every mistake / " + (root.challenge.rules.autoIndent ? "Auto-indent on" : "Type every space") : ""; textFormat: Text.PlainText; width: parent.width; wrapMode: Text.Wrap; color: Color.muted; font.family: root.fontFamily; font.pixelSize: 16 }
      Row {
        visible: !!root.challenge; spacing: 48
        Text { text: "YOU  " + (root.elapsedMs / 1000).toFixed(2) + "s"; color: Color.foreground; font.family: root.fontFamily; font.pixelSize: 32 }
        Text { text: root.ghost ? "@" + root.ghost.handle + "  " + (root.ghost.durationMs / 1000).toFixed(2) + "s" : "SET THE FIRST TIME"; textFormat: Text.PlainText; color: Color.accent; font.family: root.fontFamily; font.pixelSize: 24 }
      }
      Column {
        visible: !!root.challenge; width: parent.width; spacing: 10
        Rectangle { width: parent.width; height: 5; color: Color.muted; Rectangle { width: parent.width * (root.engine ? Math.min(1, root.playerPosition / root.engine.passage.length) : 0); height: parent.height; color: Color.accent } }
        Rectangle { visible: !!root.ghost; width: parent.width; height: 4; color: Color.background; Rectangle { width: parent.width * (root.challenge ? Math.min(1, root.ghostPosition / Array.from(root.challenge.passage).length) : 0); height: parent.height; color: Color.muted } }
      }
      Flickable {
        id: passageFlick
        visible: !!root.challenge && root.phase !== "finished"
        width: parent.width; height: Math.min(root.height * 0.42, 420); clip: true
        contentHeight: passageText.implicitHeight + 40
        TextEdit {
          id: passageText
          width: parent.width; textFormat: TextEdit.RichText; wrapMode: TextEdit.Wrap
          readOnly: true; selectByMouse: false; activeFocusOnPress: false
          color: Color.muted; font.family: root.fontFamily; font.pixelSize: 25
          text: root.challenge ? '<pre style="white-space: pre-wrap; line-height: 165%; margin: 0">' + Model.renderedPrompt(root.challenge.passage, root.entered, { normal: Color.foreground, dim: Color.muted, error: Color.urgent, cursor: Color.accent, background: Color.background }) + "</pre>" : ""
          onTextChanged: Qt.callLater(function() {
            var offset = root.entered.length + (root.entered.match(/\n/g) || []).length
            passageFlick.contentY = Math.max(0, Math.min(passageFlick.contentHeight - passageFlick.height, passageText.positionToRectangle(offset).y - 60))
          })
        }
        MouseArea { anchors.fill: parent; onClicked: catcher.forceActiveFocus() }
      }
      TextInput {
        id: catcher
        width: 1; height: 1; opacity: 0.01
        enabled: root.phase === "armed" || root.phase === "running"
        onTextEdited: {
          var input = text.normalize("NFC"); text = ""
          Array.from(input).forEach(function(character) { root.apply("input", character) })
        }
        Keys.onPressed: function(event) {
          if (event.key === Qt.Key_Backspace) { root.apply(event.modifiers & Qt.ControlModifier ? "word" : "backspace"); event.accepted = true }
          else if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) { root.apply("input", "\n"); event.accepted = true }
          else if ((event.modifiers & Qt.ControlModifier) && (event.key === Qt.Key_V || event.key === Qt.Key_Insert)) event.accepted = true
          else if ((event.modifiers & Qt.ShiftModifier) && event.key === Qt.Key_Insert) event.accepted = true
        }
      }
      Text { visible: root.phase === "armed" || root.phase === "running"; width: parent.width; wrapMode: Text.Wrap; text: root.engine && root.engine.wrong ? "Correct the highlighted mistakes to finish." : root.phase === "armed" ? "Start typing. The first key starts the clock." : "Keep your rhythm."; color: Color.muted; font.family: root.fontFamily; font.pixelSize: 16 }
      Column {
        visible: root.phase === "finished"; width: parent.width; spacing: 18
        Text { text: !root.result ? "" : root.ghost ? root.result.durationMs < root.ghost.durationMs ? "You beat @" + root.ghost.handle + "." : ((root.result.durationMs - root.ghost.durationMs) / 1000).toFixed(2) + " seconds to catch @" + root.ghost.handle : "Time set."; textFormat: Text.PlainText; color: Color.foreground; font.family: root.fontFamily; font.pixelSize: 32 }
        Text { text: root.result ? root.result.wpm + " WPM / " + root.result.accuracy + "% accuracy / " + root.result.errors + " mistakes corrected" : ""; color: Color.accent; font.family: root.fontFamily; font.pixelSize: 20 }
        Row { spacing: 16
          Action { text: "Race again"; enabled: !root.busy; onClicked: root.start() }
          Action { visible: !root.saved; text: "Retry saving"; enabled: !root.busy; onClicked: recordingFile.setText(JSON.stringify({ challenge: root.challenge, session: root.session, theme: root.resultTheme, events: root.events }) + "\n") }
          Action { visible: root.saved && !root.publicUrl; text: "Publish my result"; enabled: !root.busy; onClicked: root.call("attempt-publish", [root.session.id]) }
          Action { visible: !!root.publicUrl; text: "Copy result link"; onClicked: { copier.command = ["bash", "-c", "printf '%s' \"$1\" | wl-copy", "--", root.publicUrl]; copier.running = true } }
          Action { visible: !!root.publicUrl; text: "View result"; onClicked: { opener.command = ["xdg-open", root.publicUrl]; opener.running = true } }
        }
      }
      Text { visible: !!root.message; text: root.message; textFormat: Text.PlainText; width: parent.width; wrapMode: Text.Wrap; color: Color.accent; font.family: root.fontFamily; font.pixelSize: 16 }
      Text { visible: !!root.challenge && !!root.challenge.attribution; text: root.challenge ? root.challenge.attribution : ""; textFormat: Text.PlainText; width: parent.width; wrapMode: Text.Wrap; color: Color.muted; font.family: root.fontFamily; font.pixelSize: 14 }
    }
  }
  component Action: Controls.Button {
    id: actionButton
    font.family: root.fontFamily; font.pixelSize: 16
    padding: 12
    contentItem: Text { text: actionButton.text; font: actionButton.font; color: Color.foreground; horizontalAlignment: Text.AlignHCenter; verticalAlignment: Text.AlignVCenter }
    background: Rectangle { color: actionButton.down ? Color.accent : Color.background; border.color: actionButton.activeFocus || actionButton.hovered ? Color.accent : Color.muted; opacity: actionButton.enabled ? 1 : 0.5 }
  }
}
