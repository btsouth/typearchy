import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import qs.Commons
import qs.Ui
import "Content.js" as Content
import "ContentEngine.js" as ContentEngine
import "TypearchyModel.js" as Model

Item {
  id: root

  property var shell: null
  property var manifest: null

  readonly property string pluginId: (manifest && manifest.id) || "dev.typearchy.game"
  readonly property string home: Quickshell.env("HOME")
  readonly property string stateDir: home + "/.local/state/typearchy"
  readonly property string shareDir: home + "/Pictures/Typearchy"
  readonly property string statePath: stateDir + "/stats.json"
  readonly property string customDir: home + "/.local/share/typearchy"
  readonly property string customPath: customDir + "/passages.txt"

  property bool opened: false
  property bool windowedStats: false
  property string mode: "sprint"
  property int duration: 30
  property string sprintStyle: "prose"
  property string codeLanguage: "bash"
  property var challenge: ({})
  property string prompt: ""
  property string typedText: ""
  property real promptLineY: 0
  property string phase: "ready"
  property bool statsOpen: false
  property string historyFilter: "all"
  property double startedAt: 0
  property double elapsedMs: 0
  property int totalKeypresses: 0
  property int incorrectKeypresses: 0
  property var keyMistakes: ({})
  property var bigramMistakes: ({})
  property var paceSamples: []
  property var customPassages: []
  property var stats: Model.emptyState()
  property bool statsLoaded: false
  property var pendingOpenPayload: null
  property var currentResult: null
  property var ghostRun: null
  property string shareStatus: ""
  property double resultsShownAt: 0
  property bool exportingCard: false
  property int runNonce: 0

  readonly property color foreground: Color.foreground
  readonly property color background: Color.background
  readonly property color accent: Color.accent
  readonly property color urgent: Color.urgent
  readonly property color muted: Color.muted
  readonly property string fontFamily: Style.font.family
  readonly property bool showLiveStats: stats.settings.showLiveStats !== false
  readonly property bool ghostEnabled: stats.settings.ghostEnabled !== false
  readonly property real fontScale: Number(stats.settings.fontScale) || 1
  readonly property bool isTimed: challenge.targetKind === "time"
  readonly property int correctChars: Model.correctCharacters(prompt, typedText)
  readonly property real liveWpm: Model.wordsPerMinute(correctChars, Math.max(1, elapsedMs))
  readonly property real remainingSeconds: Math.max(0, duration - elapsedMs / 1000)
  readonly property real ghostWpm: ghostEnabled ? Model.paceAt(ghostRun, elapsedMs) : 0
  readonly property real ghostDelta: liveWpm - ghostWpm
  readonly property var historyRuns: Model.filteredRuns(stats, historyFilter, 500)
  readonly property var trendRuns: Model.recentTrend(stats, historyFilter, 20)
  readonly property var activeQuoteSegment: root.quoteSegmentAt(root.typedText.length)
  readonly property var dailyResult: mode === "daily" && challenge.challengeId
    ? Model.dailyRun(stats, challenge.challengeId) : null
  readonly property string modeDetail: mode === "quote" && activeQuoteSegment
    ? "QUOTE RELAY  /  " + activeQuoteSegment.index + " OF " + activeQuoteSegment.total
      + "  /  " + String(activeQuoteSegment.shortAuthor).toUpperCase()
    : challenge.label
    ? challenge.label + (challenge.detail ? "  /  " + String(challenge.detail).toUpperCase() : "")
      + (dailyResult ? "  /  BEST " + Math.round(dailyResult.wpm) + " WPM" : "")
    : Content.modeLabel(mode)
  readonly property string headerDetail: statsOpen ? "LOCAL HISTORY" : modeDetail
  readonly property string promptMarkup: Model.renderedPrompt(prompt, typedText, {
    normal: foreground,
    dim: muted,
    error: urgent,
    cursor: accent,
    background: background
  })

  function open(payloadJson) {
    var payload = {}
    try { payload = JSON.parse(payloadJson || "{}") || {} } catch (error) {}
    root.windowedStats = payload.view === "stats"
    root.opened = true
    if (!root.statsLoaded) {
      root.pendingOpenPayload = payload
      statsFile.reload()
      Qt.callLater(function() {
        if (root.windowedStats) statsKeyCatcher.forceActiveFocus()
        else keyCatcher.forceActiveFocus()
      })
      return
    }
    root.prepareOpen(payload)
  }

  function prepareOpen(payload) {
    root.windowedStats = payload.view === "stats"
    root.mode = Content.validMode(payload.mode || root.stats.settings.defaultMode)
    var requestedDuration = Number(payload.duration || root.stats.settings.duration)
    root.duration = [15, 30, 60].indexOf(requestedDuration) >= 0 ? requestedDuration : 30
    root.sprintStyle = Content.validSprintStyle(payload.sprintStyle || root.stats.settings.sprintStyle)
    root.codeLanguage = Content.validLanguage(payload.language || root.stats.settings.codeLanguage)
    root.resetTest()
    root.statsOpen = payload.view === "stats"
    Qt.callLater(function() {
      if (root.windowedStats) statsKeyCatcher.forceActiveFocus()
      else keyCatcher.forceActiveFocus()
    })
  }

  function close() {
    ticker.stop()
    sampleTimer.stop()
    root.opened = false
    root.windowedStats = false
  }

  function dismiss() {
    if (root.shell && typeof root.shell.hide === "function") root.shell.hide(root.pluginId)
    else root.close()
  }

  function resetTest() {
    ticker.stop()
    sampleTimer.stop()
    root.runNonce++
    var seed = root.runNonce + "-" + Date.now()
    var generated = null
    if (root.mode === "sprint")
      generated = root.sprintStyle === "words"
        ? ContentEngine.generateWords(Content.WORDS, Math.min(Content.WORDS.length, Math.max(160, Math.ceil(root.duration * 5.5))), "sprint-words-" + seed)
        : ContentEngine.generateProse(Content.DAILY_PASSAGES, "sprint-prose-" + seed, Math.max(680, root.duration * 18))
    else if (root.mode === "quote")
      generated = ContentEngine.generateQuoteRelay(Content.QUOTES, "quote-" + seed, 4)
    else if (root.mode === "shell")
      generated = ContentEngine.generateShell(seed, Math.max(360, root.duration * 16))
    else if (root.mode === "code")
      generated = ContentEngine.generateCode(root.codeLanguage, seed, Math.max(360, root.duration * 16))
    var drillProfile = Model.drillProfile(root.stats, 12)
    root.challenge = Content.buildChallenge({
      mode: root.mode,
      now: new Date(),
      nonce: seed,
      duration: root.duration,
      sprintStyle: root.sprintStyle,
      language: root.codeLanguage,
      drillKeys: drillProfile.keys,
      drillBigrams: drillProfile.bigrams,
      drillCalibrating: drillProfile.calibrating,
      customPassages: root.customPassages,
      generated: generated
    })
    root.ghostRun = Model.bestComparableRun(root.stats, root.challenge)
    root.prompt = root.challenge.prompt
    root.typedText = ""
    root.promptLineY = 0
    root.phase = "ready"
    root.startedAt = 0
    root.elapsedMs = 0
    root.totalKeypresses = 0
    root.incorrectKeypresses = 0
    root.keyMistakes = {}
    root.bigramMistakes = {}
    root.paceSamples = []
    root.currentResult = null
    root.statsOpen = false
    root.shareStatus = ""
    root.resultsShownAt = 0
    root.exportingCard = false
    promptFlick.contentY = 0
    Qt.callLater(function() { keyCatcher.forceActiveFocus() })
  }

  function savePreferences() {
    var next = Model.parseState(JSON.stringify(root.stats))
    next.settings.defaultMode = root.mode
    next.settings.duration = root.duration
    next.settings.sprintStyle = root.sprintStyle
    next.settings.codeLanguage = root.codeLanguage
    root.stats = next
    statsFile.setText(JSON.stringify(root.stats, null, 2) + "\n")
  }

  function updatePreference(name, value) {
    var next = Model.parseState(JSON.stringify(root.stats))
    next.settings[name] = value
    root.stats = next
    statsFile.setText(JSON.stringify(root.stats, null, 2) + "\n")
  }

  function toggleLiveStats() {
    root.updatePreference("showLiveStats", !root.showLiveStats)
  }

  function toggleGhost() {
    root.updatePreference("ghostEnabled", !root.ghostEnabled)
  }

  function cycleFontScale() {
    var values = [0.9, 1, 1.1]
    var index = values.indexOf(root.fontScale)
    root.updatePreference("fontScale", values[(index + 1) % values.length])
  }

  function setHistoryFilter(filter) {
    root.historyFilter = filter === "all" ? "all" : Content.validMode(filter)
    historyFlick.contentY = 0
  }

  function setMode(nextMode) {
    if (root.phase === "running") return
    root.mode = Content.validMode(nextMode)
    root.savePreferences()
    root.resetTest()
  }

  function cycleMode(direction) {
    var index = Content.MODES.indexOf(root.mode)
    root.setMode(Content.MODES[(index + direction + Content.MODES.length) % Content.MODES.length])
  }

  function toggleStats() {
    if (root.phase === "running") return
    root.statsOpen = !root.statsOpen
  }

  function setDuration(seconds) {
    if (root.phase === "running" || [15, 30, 60].indexOf(seconds) < 0) return
    root.duration = seconds
    root.savePreferences()
    root.resetTest()
  }

  function setSprintStyle(style) {
    if (root.phase === "running") return
    root.sprintStyle = Content.validSprintStyle(style)
    root.savePreferences()
    root.resetTest()
  }

  function setLanguage(language) {
    if (root.phase === "running") return
    root.codeLanguage = Content.validLanguage(language)
    root.savePreferences()
    root.resetTest()
  }

  function chooseNumber(index) {
    if (root.mode === "sprint" || root.mode === "shell" || root.mode === "code") root.setDuration([15, 30, 60][index])
  }

  function beginTest() {
    if (root.phase !== "ready") return
    root.phase = "running"
    root.startedAt = Date.now()
    root.elapsedMs = 0
    ticker.start()
    sampleTimer.start()
  }

  function addCharacter(character) {
    if (root.challenge.available === false || root.phase === "results" || root.typedText.length >= root.prompt.length) return
    if (root.phase === "ready") root.beginTest()
    var index = root.typedText.length
    var expected = root.prompt.charAt(index)
    root.totalKeypresses++
    if (character !== expected) {
      root.incorrectKeypresses++
      var mistake = Model.addMistake(root.keyMistakes, root.bigramMistakes, expected,
        index > 0 ? root.prompt.charAt(index - 1) : "")
      root.keyMistakes = mistake.keys
      root.bigramMistakes = mistake.bigrams
    }
    root.typedText += character
    if (!root.isTimed && root.typedText.length >= root.prompt.length) root.finishTest(true)
  }

  function eraseCharacter() {
    if (root.phase === "results" || root.typedText.length === 0) return
    root.typedText = root.typedText.slice(0, -1)
  }

  function eraseWord() {
    if (root.phase === "results" || root.typedText.length === 0) return
    root.typedText = root.typedText.slice(0, Model.eraseWordIndex(root.typedText))
  }

  function finishTest(completed) {
    if (root.phase === "results") return
    ticker.stop()
    sampleTimer.stop()
    root.elapsedMs = Math.max(1000, root.startedAt > 0 ? Date.now() - root.startedAt : 1000)

    var finalWpm = Model.wordsPerMinute(root.correctChars, root.elapsedMs)
    var finalPace = root.paceSamples.slice()
    if (finalPace.length === 0 || Math.abs(finalPace[finalPace.length - 1] - finalWpm) > 0.1)
      finalPace.push(finalWpm)
    var previousBest = root.ghostRun ? root.ghostRun.wpm : 0

    var run = {
      timestamp: new Date().toISOString(),
      date: Model.localDateKey(new Date()),
      mode: root.mode,
      duration: root.isTimed ? root.duration : Math.round(root.elapsedMs / 1000),
      target: root.challenge.detail || "",
      challengeKey: root.challenge.challengeKey || "",
      completed: completed !== false,
      contentVersion: root.challenge.version || "",
      language: root.challenge.language || "",
      sprintStyle: root.challenge.sprintStyle || "",
      drillKeys: root.challenge.drillKeys || [],
      drillBigrams: root.challenge.drillBigrams || [],
      targetErrors: Model.drillTargetErrors(root.challenge, root.keyMistakes, root.bigramMistakes),
      characters: root.correctChars,
      wpm: finalWpm,
      rawWpm: Model.rawWordsPerMinute(root.totalKeypresses, root.elapsedMs),
      accuracy: Model.accuracy(root.totalKeypresses, root.incorrectKeypresses),
      consistency: Model.consistency(root.paceSamples),
      errors: root.incorrectKeypresses,
      dailyId: root.challenge.challengeId || "",
      previousBestWpm: previousBest,
      personalBest: !!root.ghostRun && finalWpm > previousBest,
      keyMistakes: root.keyMistakes,
      bigramMistakes: root.bigramMistakes,
      pace: finalPace
    }
    root.currentResult = Model.normalizeRun(run)
    root.stats = Model.recordRun(root.stats, run)
    statsFile.setText(JSON.stringify(root.stats, null, 2) + "\n")
    root.resultsShownAt = Date.now()
    root.phase = "results"
    Qt.callLater(function() { keyCatcher.forceActiveFocus() })
  }

  function shareResult() {
    if (!root.currentResult || root.phase !== "results" || root.exportingCard) return
    root.shareStatus = "Creating local card..."
    root.exportingCard = true
    var stamp = root.currentResult.timestamp.replace(/[:.]/g, "-")
    var path = root.shareDir + "/typearchy-" + stamp + ".png"
    Qt.callLater(function() {
      resultCard.grabToImage(function(result) {
        root.exportingCard = false
        if (!result || !result.saveToFile(path)) {
          root.copyResultText()
          root.shareStatus = "Image failed. Result text copied."
          return
        }
        copyImageProc.command = ["bash", "-c", "wl-copy --type image/png < \"$1\"", "--", path]
        copyImageProc.running = true
        root.shareStatus = "Card copied  /  " + path
      }, Qt.size(1440, 752))
    })
  }

  function copyResultText() {
    if (!root.currentResult) return
    copyTextProc.command = ["bash", "-c", "printf '%s' \"$1\" | wl-copy", "--", Model.shareText(root.currentResult)]
    copyTextProc.running = true
    root.shareStatus = "Result text copied"
  }

  function mistakeSummary(counts, limit) {
    var rows = Model.sortedCounts(counts, limit)
    if (!rows.length) return "None yet"
    return rows.map(function(row) { return row.key + "  " + row.count }).join("  ·  ")
  }

  function quoteSegmentAt(position) {
    var segments = root.challenge && Array.isArray(root.challenge.segments) ? root.challenge.segments : []
    if (!segments.length) return null
    var cursor = Math.max(0, Number(position) || 0)
    for (var i = 0; i < segments.length; i++)
      if (cursor <= segments[i].end) return segments[i]
    return segments[segments.length - 1]
  }

  function readyHint() {
    if (root.challenge.available === false)
      return "press o to open passages.txt  /  separate entries with a blank line"
    if (root.mode === "sprint")
      return "start typing  /  w words  /  p prose  /  1 2 3 changes duration"
    if (root.mode === "quote")
      return "start typing  /  enter advances the relay  /  tab changes mode"
    if (root.mode === "shell")
      return "start typing  /  1 2 3 changes duration  /  enter types return"
    if (root.mode === "code")
      return "start typing  /  1 2 3 changes duration  /  choose a language above"
    if (root.mode === "drill")
      return "start typing  /  recent mistakes set the targets  /  tab changes mode"
    if (root.mode === "custom")
      return "start typing  /  o edits passages  /  tab changes mode"
    return "start typing  /  tab changes mode  /  h shows stats"
  }

  function trendMaximum(runs) {
    var maximum = 1
    for (var i = 0; i < runs.length; i++) maximum = Math.max(maximum, Number(runs[i].wpm) || 0)
    return maximum
  }

  function openCustomPassages() {
    openCustomProc.command = ["xdg-open", root.customPath]
    openCustomProc.running = true
    root.dismiss()
  }

  function loadStats(raw) {
    root.stats = Model.parseState(raw)
    root.statsLoaded = true
    if (root.opened && root.pendingOpenPayload) {
      var payload = root.pendingOpenPayload
      root.pendingOpenPayload = null
      root.prepareOpen(payload)
    }
  }

  function loadCustomPassages(raw) {
    root.customPassages = Content.parseCustomPassages(raw)
    if (root.opened && root.mode === "custom" && root.phase === "ready") {
      var showingStats = root.statsOpen
      root.resetTest()
      root.statsOpen = showingStats
    }
  }

  onTypedTextChanged: {
    if (prompt.length < 1) return
    Qt.callLater(function() {
      if (promptFlick.contentHeight <= promptFlick.height || typeof promptText.positionToRectangle !== "function") return
      var cursorRect = promptText.positionToRectangle(Math.min(root.typedText.length, root.prompt.length))
      var nextLineY = Math.max(0, cursorRect.y)
      if (Math.abs(nextLineY - root.promptLineY) < 1) return
      root.promptLineY = nextLineY
      promptFlick.contentY = Math.max(0, Math.min(promptFlick.contentHeight - promptFlick.height, nextLineY))
    })
  }

  Component.onCompleted: initProc.running = true

  Process {
    id: initProc
    command: ["bash", "-c", "mkdir -p \"$1\" \"$2\" \"$3\" && touch \"$4\"", "--",
      root.stateDir, root.shareDir, root.customDir, root.customPath]
    onExited: {
      statsFile.reload()
      customFile.reload()
    }
  }

  Process { id: copyImageProc }
  Process { id: copyTextProc }
  Process { id: openCustomProc }

  FileView {
    id: statsFile
    path: root.statePath
    atomicWrites: true
    printErrors: false
    onLoaded: root.loadStats(text())
    onLoadFailed: root.loadStats("")
  }

  FileView {
    id: customFile
    path: root.customPath
    watchChanges: true
    printErrors: false
    onLoaded: root.loadCustomPassages(text())
    onLoadFailed: root.loadCustomPassages("")
    onFileChanged: reload()
  }

  Timer {
    id: ticker
    interval: 50
    repeat: true
    onTriggered: {
      root.elapsedMs = Date.now() - root.startedAt
      if (root.isTimed && root.elapsedMs >= root.duration * 1000) root.finishTest(true)
    }
  }

  Timer {
    id: sampleTimer
    interval: 1000
    repeat: true
    onTriggered: {
      var next = root.paceSamples.slice()
      next.push(root.liveWpm)
      root.paceSamples = next
    }
  }

  PanelWindow {
    id: window
    visible: root.opened && !root.windowedStats
    anchors { top: true; bottom: true; left: true; right: true }
    color: "transparent"
    exclusionMode: ExclusionMode.Ignore
    WlrLayershell.namespace: "typearchy"
    WlrLayershell.layer: WlrLayer.Overlay
    WlrLayershell.keyboardFocus: visible ? WlrKeyboardFocus.Exclusive : WlrKeyboardFocus.None

    Rectangle {
      anchors.fill: parent
      color: root.background

      Rectangle {
        anchors.fill: parent
        color: root.accent
        opacity: 0.025
      }
    }

    Item {
      id: keyCatcher
      anchors.fill: parent
      focus: true
      Keys.priority: Keys.BeforeItem
      Keys.onPressed: function(event) {
        if (root.phase === "results" && !root.statsOpen) {
          if (event.key === Qt.Key_Escape) {
            root.dismiss()
            event.accepted = true
            return
          }
          var resultKey = event.key === Qt.Key_R ? "r"
            : (event.key === Qt.Key_S ? "s"
            : (event.key === Qt.Key_C ? "c"
            : (event.key === Qt.Key_H ? "h" : "")))
          var action = Model.resultAction(resultKey,
            !!(event.modifiers & Qt.ControlModifier), Date.now() - root.resultsShownAt, event.isAutoRepeat)
          if (action === "retry") root.resetTest()
          else if (action === "share") root.shareResult()
          else if (action === "copy") root.copyResultText()
          else if (action === "history") root.toggleStats()
          event.accepted = true
          return
        }

        if ((event.modifiers & Qt.ControlModifier) && event.key === Qt.Key_R) {
          root.resetTest()
          event.accepted = true
          return
        }

        if (event.key === Qt.Key_Escape) {
          if (root.statsOpen) {
            root.statsOpen = false
            event.accepted = true
            return
          }
          root.dismiss()
          event.accepted = true
          return
        }

        if (root.phase !== "running" && (event.text === "h" || event.text === "H")) {
          root.toggleStats()
          event.accepted = true
          return
        }

        if (root.statsOpen) {
          var filters = ["all", "sprint", "words", "daily", "quote", "shell", "code", "drill", "custom"]
          var filterIndex = Number(event.text)
          if (event.key === Qt.Key_Down || event.key === Qt.Key_PageDown)
            historyFlick.contentY = Math.min(Math.max(0, historyFlick.contentHeight - historyFlick.height),
              historyFlick.contentY + Style.space(event.key === Qt.Key_PageDown ? 140 : 36))
          else if (event.key === Qt.Key_Up || event.key === Qt.Key_PageUp)
            historyFlick.contentY = Math.max(0,
              historyFlick.contentY - Style.space(event.key === Qt.Key_PageUp ? 140 : 36))
          else if (event.text >= "0" && event.text <= "8") root.setHistoryFilter(filters[filterIndex])
          else if (event.text === "l" || event.text === "L") root.toggleLiveStats()
          else if (event.text === "g" || event.text === "G") root.toggleGhost()
          else if (event.text === "f" || event.text === "F") root.cycleFontScale()
          event.accepted = true
          return
        }

        if (root.phase !== "running") {
          if (root.mode === "sprint" && (event.text === "w" || event.text === "W")) {
            root.setSprintStyle("words")
            event.accepted = true
            return
          }
          if (root.mode === "sprint" && (event.text === "p" || event.text === "P")) {
            root.setSprintStyle("prose")
            event.accepted = true
            return
          }
          if (root.mode === "custom" && (event.text === "o" || event.text === "O")) {
            root.openCustomPassages()
            event.accepted = true
            return
          }
          if (event.text === "1") { root.chooseNumber(0); event.accepted = true; return }
          if (event.text === "2") { root.chooseNumber(1); event.accepted = true; return }
          if (event.text === "3") { root.chooseNumber(2); event.accepted = true; return }
          if (event.key === Qt.Key_Tab) {
            root.cycleMode(event.modifiers & Qt.ShiftModifier ? -1 : 1)
            event.accepted = true
            return
          }
        }

        if (event.key === Qt.Key_Backspace) {
          if (event.modifiers & Qt.ControlModifier) root.eraseWord()
          else root.eraseCharacter()
          event.accepted = true
          return
        }

        if (root.phase === "running" && (event.key === Qt.Key_Return || event.key === Qt.Key_Enter)
            && root.prompt.charAt(root.typedText.length) === "\n") {
          root.addCharacter("\n")
          event.accepted = true
          return
        }

        if (root.phase === "running" && event.key === Qt.Key_Tab
            && root.prompt.charAt(root.typedText.length) === "\t") {
          root.addCharacter("\t")
          event.accepted = true
          return
        }

        var plainModifier = event.modifiers === Qt.NoModifier || event.modifiers === Qt.ShiftModifier
        if (plainModifier && event.text && event.text.length === 1 && event.text.charCodeAt(0) >= 32) {
          root.addCharacter(event.text)
          event.accepted = true
        }
      }

      Column {
        id: layout
        anchors.fill: parent
        anchors.leftMargin: Math.max(Style.space(36), parent.width * 0.08)
        anchors.rightMargin: Math.max(Style.space(36), parent.width * 0.08)
        anchors.topMargin: Math.max(Style.space(28), parent.height * 0.06)
        anchors.bottomMargin: Math.max(Style.space(24), parent.height * 0.05)
        spacing: Style.space(20)

        Row {
          width: parent.width
          height: Style.space(44)

          Column {
            width: parent.width * 0.56
            spacing: Style.space(2)

            Text {
              text: "TYPEARCHY"
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.heading
              font.bold: true
              font.letterSpacing: 3
            }

            Text {
              text: root.headerDetail
              color: root.accent
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
              font.bold: true
              font.letterSpacing: 1.3
            }
          }

          Row {
            width: parent.width * 0.44
            anchors.verticalCenter: parent.verticalCenter
            layoutDirection: Qt.RightToLeft
            spacing: Style.space(24)
            visible: root.statsOpen || root.phase === "ready" || root.showLiveStats

            Metric {
              label: root.statsOpen ? "TESTS" : (root.isTimed ? "LEFT" : "TIME")
              value: root.statsOpen ? root.stats.totalTests.toString() : (root.phase === "ready"
                ? (root.isTimed ? root.duration.toString() : "0")
                : (root.isTimed ? Math.ceil(root.remainingSeconds).toString() : Math.floor(root.elapsedMs / 1000).toString()))
            }
            Metric {
              label: root.statsOpen ? "BEST" : "WPM"
              value: root.statsOpen ? Math.round(root.stats.bestWpm || 0).toString()
                : (root.phase === "ready" ? "-" : Math.round(root.liveWpm).toString())
            }
            Metric {
              label: root.statsOpen ? "AVG 10" : "ACC"
              value: root.statsOpen ? Math.round(Model.recentAverage(root.stats, "wpm", 10)).toString()
                : (root.phase === "ready" ? "-" : Math.round(Model.accuracy(root.totalKeypresses, root.incorrectKeypresses)) + "%")
            }
          }
        }

        Item {
          width: parent.width
          height: parent.height - layout.spacing * 2 - Style.space(44) - Style.space(42)

          Column {
            visible: !root.statsOpen && root.phase !== "results"
            width: Math.min(parent.width, Style.space(1080))
            anchors.centerIn: parent
            spacing: Style.space(18)

            Row {
              anchors.horizontalCenter: parent.horizontalCenter
              spacing: Style.space(5)
              visible: root.phase === "ready"

              Choice { text: "SPRINT"; selected: root.mode === "sprint"; onClicked: root.setMode("sprint") }
              Choice { text: "DAILY"; selected: root.mode === "daily"; onClicked: root.setMode("daily") }
              Choice { text: "QUOTE"; selected: root.mode === "quote"; onClicked: root.setMode("quote") }
              Choice { text: "SHELL"; selected: root.mode === "shell"; onClicked: root.setMode("shell") }
              Choice { text: "CODE"; selected: root.mode === "code"; onClicked: root.setMode("code") }
              Choice { text: "DRILL"; selected: root.mode === "drill"; onClicked: root.setMode("drill") }
              Choice { text: "CUSTOM"; selected: root.mode === "custom"; onClicked: root.setMode("custom") }
            }

            Row {
              anchors.horizontalCenter: parent.horizontalCenter
              spacing: Style.space(7)
              visible: root.phase === "ready" && (root.mode === "sprint" || root.mode === "shell" || root.mode === "code")

              Choice {
                text: "15 SEC"
                selected: root.duration === 15
                onClicked: root.chooseNumber(0)
              }
              Choice {
                text: "30 SEC"
                selected: root.duration === 30
                onClicked: root.chooseNumber(1)
              }
              Choice {
                text: "60 SEC"
                selected: root.duration === 60
                onClicked: root.chooseNumber(2)
              }
            }

            Row {
              anchors.horizontalCenter: parent.horizontalCenter
              spacing: Style.space(7)
              visible: root.phase === "ready" && root.mode === "sprint"

              Choice { text: "WORDS"; selected: root.sprintStyle === "words"; onClicked: root.setSprintStyle("words") }
              Choice { text: "PROSE"; selected: root.sprintStyle === "prose"; onClicked: root.setSprintStyle("prose") }
            }

            Row {
              anchors.horizontalCenter: parent.horizontalCenter
              spacing: Style.space(7)
              visible: root.phase === "ready" && root.mode === "code"

              Choice { text: "BASH"; selected: root.codeLanguage === "bash"; onClicked: root.setLanguage("bash") }
              Choice { text: "PYTHON"; selected: root.codeLanguage === "python"; onClicked: root.setLanguage("python") }
              Choice { text: "JS"; selected: root.codeLanguage === "javascript"; onClicked: root.setLanguage("javascript") }
              Choice { text: "RUST"; selected: root.codeLanguage === "rust"; onClicked: root.setLanguage("rust") }
            }

            Row {
              anchors.horizontalCenter: parent.horizontalCenter
              spacing: Style.space(10)
              visible: root.phase === "ready" && root.mode === "custom"

              Choice { text: "OPEN PASSAGES"; selected: false; onClicked: root.openCustomPassages() }
              Text {
                anchors.verticalCenter: parent.verticalCenter
                text: root.customPassages.length + (root.customPassages.length === 1 ? " LOCAL PASSAGE" : " LOCAL PASSAGES")
                color: root.muted
                font.family: root.fontFamily
                font.pixelSize: Style.font.caption
                font.letterSpacing: 1
              }
            }

            Text {
              anchors.horizontalCenter: parent.horizontalCenter
              visible: root.phase === "running" && root.ghostEnabled && !!root.ghostRun && root.ghostWpm > 0
              text: "GHOST  " + (root.ghostDelta >= 0 ? "+" : "") + Math.round(root.ghostDelta)
                + " WPM  /  PB " + Math.round(root.ghostRun ? root.ghostRun.wpm : 0)
              color: root.ghostDelta >= 0 ? root.accent : root.muted
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
              font.bold: root.ghostDelta >= 0
              font.letterSpacing: 1
            }

            Flickable {
              id: promptFlick
              width: parent.width
              height: Math.min(promptText.contentHeight,
                promptText.font.pixelSize * promptText.lineHeight * 2 + Style.space(2))
              contentWidth: width
              contentHeight: promptText.contentHeight
              clip: true
              boundsBehavior: Flickable.StopAtBounds
              interactive: false

              Behavior on contentY {
                NumberAnimation { duration: 70; easing.type: Easing.OutCubic }
              }

              TextEdit {
                id: promptText
                width: promptFlick.width
                height: contentHeight
                text: root.challenge.available === false ? root.prompt : root.promptMarkup
                textFormat: TextEdit.RichText
                wrapMode: TextEdit.Wrap
                readOnly: true
                selectByMouse: false
                activeFocusOnPress: false
                cursorVisible: false
                color: root.muted
                font.family: root.fontFamily
                font.pixelSize: Math.max(Style.font.heading,
                  Style.space(root.mode === "code" || root.mode === "shell" ? 25 : 34)) * root.fontScale
                font.letterSpacing: root.mode === "code" || root.mode === "shell" ? 0 : 0.4
                lineHeight: root.mode === "code" || root.mode === "shell" ? 1.38 : 1.48
                lineHeightMode: TextEdit.ProportionalHeight
              }
            }

            Rectangle {
              width: parent.width
              height: Style.space(2)
              visible: root.phase === "running" && !root.isTimed
              radius: height / 2
              color: root.muted
              opacity: 0.22

              Rectangle {
                width: parent.width * Math.min(1, root.typedText.length / Math.max(1, root.prompt.length))
                height: parent.height
                radius: parent.radius
                color: root.accent
              }
            }

            Text {
              anchors.horizontalCenter: parent.horizontalCenter
              text: root.phase === "ready"
                ? root.readyHint()
                : "esc exits  /  backspace corrects  /  ctrl+r restarts"
              color: root.muted
              opacity: 0.72
              font.family: root.fontFamily
              font.pixelSize: Style.font.bodySmall
            }
          }

          Rectangle {
            id: resultCard
            visible: !root.statsOpen && root.phase === "results"
            width: Math.min(parent.width, Style.space(900))
            height: Math.min(parent.height, Style.space(470))
            anchors.centerIn: parent
            radius: Style.cornerRadius
            color: Color.popups.background
            border.width: Math.max(1, Style.normalBorderWidth)
            border.color: Color.popups.border

            Rectangle {
              width: Style.space(7)
              anchors.top: parent.top
              anchors.bottom: parent.bottom
              anchors.left: parent.left
              color: root.accent
              radius: parent.radius
            }

            Repeater {
              model: 7
              Rectangle {
                required property int index
                x: resultCard.width * (index + 1) / 8
                y: 0
                width: 1
                height: resultCard.height
                color: root.accent
                opacity: 0.035
              }
            }

            Column {
              anchors.fill: parent
              anchors.margins: Style.space(34)
              spacing: Style.space(12)

              Row {
                width: parent.width

                Text {
                  width: parent.width * 0.55
                  text: "TYPEARCHY"
                  color: root.foreground
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.heading
                  font.bold: true
                  font.letterSpacing: 3
                }

                Text {
                  width: parent.width * 0.45
                  text: root.currentResult
                    ? Content.modeLabel(root.currentResult.mode) + (root.currentResult.target ? "  /  " + String(root.currentResult.target).toUpperCase() : "")
                    : ""
                  color: root.accent
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.bodySmall
                  font.bold: true
                  horizontalAlignment: Text.AlignRight
                }
              }

              Item {
                width: parent.width
                height: Style.space(112)

                Text {
                  anchors.left: parent.left
                  anchors.verticalCenter: parent.verticalCenter
                  text: root.currentResult ? Math.round(root.currentResult.wpm) : "0"
                  color: root.foreground
                  font.family: root.fontFamily
                  font.pixelSize: Style.space(86)
                  font.bold: true
                }

                Text {
                  anchors.left: parent.left
                  anchors.leftMargin: Style.space(176)
                  anchors.bottom: parent.bottom
                  anchors.bottomMargin: Style.space(18)
                  text: "WPM"
                  color: root.muted
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.heading
                  font.bold: true
                  font.letterSpacing: 2
                }

                Column {
                  anchors.right: parent.right
                  anchors.verticalCenter: parent.verticalCenter
                  spacing: Style.space(4)

                  Text {
                    anchors.right: parent.right
                    text: root.currentResult && root.currentResult.personalBest
                      ? "NEW PERSONAL BEST"
                      : (root.currentResult && root.currentResult.previousBestWpm > 0 ? "PERSONAL BEST" : "FIRST RESULT")
                    color: root.currentResult && root.currentResult.personalBest ? root.accent : root.muted
                    font.family: root.fontFamily
                    font.pixelSize: Style.font.caption
                    font.bold: true
                    font.letterSpacing: 1
                  }

                  Text {
                    anchors.right: parent.right
                    text: root.currentResult && root.currentResult.personalBest
                      ? "+" + Math.round(root.currentResult.wpm - root.currentResult.previousBestWpm) + " WPM"
                      : (root.currentResult && root.currentResult.previousBestWpm > 0
                        ? Math.round(root.currentResult.previousBestWpm) + " WPM" : "BASELINE SET")
                    color: root.foreground
                    font.family: root.fontFamily
                    font.pixelSize: Style.font.body
                    font.bold: true
                  }
                }
              }

              Row {
                width: parent.width
                spacing: Style.space(30)

                ResultMetric { label: "ACCURACY"; value: root.currentResult ? root.currentResult.accuracy + "%" : "-" }
                ResultMetric { label: "RAW"; value: root.currentResult ? Math.round(root.currentResult.rawWpm) + " WPM" : "-" }
                ResultMetric { label: "CONSISTENCY"; value: root.currentResult ? root.currentResult.consistency + "%" : "-" }
                ResultMetric { label: "ERRORS"; value: root.currentResult ? root.currentResult.errors : "-" }
              }

              PaceGraph {
                width: parent.width
                height: Style.space(94)
                samples: root.currentResult ? root.currentResult.pace : []
                referenceWpm: root.currentResult ? root.currentResult.previousBestWpm : 0
                finalWpm: root.currentResult ? root.currentResult.wpm : 0
              }

              Row {
                width: parent.width

                Text {
                  width: parent.width * 0.62
                  text: root.currentResult && root.currentResult.mode === "drill"
                    ? "TARGET ERRORS  " + root.currentResult.targetErrors + "  /  " + String(root.currentResult.target).toUpperCase()
                    : (Model.weakKeys(root.stats, 4).length
                      ? "DRILL NEXT  " + Model.weakKeys(root.stats, 4).join("  ")
                      : "CLEAN RUN. KEEP THE RHYTHM.")
                  color: root.muted
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.caption
                  font.letterSpacing: 1
                }

                Text {
                  width: parent.width * 0.38
                  text: "BEAT THIS RUN  /  TYPEARCHY.COM"
                  color: root.muted
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.caption
                  font.letterSpacing: 1
                  horizontalAlignment: Text.AlignRight
                }
              }

              Row {
                visible: !root.exportingCard
                width: parent.width
                spacing: Style.space(8)

                ResultAction { text: "RETRY  CTRL+R"; onClicked: root.resetTest() }
                ResultAction { text: "SAVE CARD  CTRL+S"; onClicked: root.shareResult() }
                ResultAction { text: "COPY TEXT  CTRL+C"; onClicked: root.copyResultText() }
                ResultAction { text: "HISTORY  CTRL+H"; onClicked: root.toggleStats() }
              }

              Row {
                visible: root.exportingCard
                width: parent.width
                height: Style.space(32)

                Text {
                  width: parent.width * 0.62
                  anchors.verticalCenter: parent.verticalCenter
                  text: "KEEP YOUR FINGERS SHARP."
                  color: root.accent
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.bodySmall
                  font.bold: true
                  font.letterSpacing: 1.3
                }
                Text {
                  width: parent.width * 0.38
                  anchors.verticalCenter: parent.verticalCenter
                  text: root.currentResult ? String(root.currentResult.date).toUpperCase() + "  /  LOCAL RUN" : "LOCAL RUN"
                  color: root.muted
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.caption
                  font.letterSpacing: 1
                  horizontalAlignment: Text.AlignRight
                }
              }
            }
          }

          Rectangle {
            visible: root.statsOpen
            width: Math.min(parent.width, Style.space(920))
            height: Math.min(parent.height, statsContent.implicitHeight + Style.space(56))
            anchors.centerIn: parent
            radius: Style.cornerRadius
            color: Color.popups.background
            border.width: Math.max(1, Style.normalBorderWidth)
            border.color: Color.popups.border

            Column {
              id: statsContent
              anchors.fill: parent
              anchors.margins: Style.space(28)
              spacing: Style.space(10)

              Row {
                width: parent.width
                spacing: Style.space(16)

                HistoryMetric {
                  label: "TODAY"
                  value: Model.bestForDate(root.stats, Model.localDateKey(new Date())) > 0
                    ? Math.round(Model.bestForDate(root.stats, Model.localDateKey(new Date()))) + " WPM" : "-"
                }
                HistoryMetric { label: "ALL TIME"; value: Math.round(root.stats.bestWpm || 0) + " WPM" }
                HistoryMetric { label: "STREAK"; value: (root.stats.streak || 0) + " DAYS" }
                HistoryMetric { label: "AVG ACC"; value: Model.recentAverage(root.stats, "accuracy", 10) + "%" }
              }

              Rectangle { width: parent.width; height: 1; color: root.muted; opacity: 0.22 }

              Row {
                anchors.horizontalCenter: parent.horizontalCenter
                spacing: Style.space(4)

                HistoryChoice { text: "ALL"; selected: root.historyFilter === "all"; onClicked: root.setHistoryFilter("all") }
                HistoryChoice { text: "SPRINT"; selected: root.historyFilter === "sprint"; onClicked: root.setHistoryFilter("sprint") }
                HistoryChoice { text: "WORDS"; selected: root.historyFilter === "words"; onClicked: root.setHistoryFilter("words") }
                HistoryChoice { text: "DAILY"; selected: root.historyFilter === "daily"; onClicked: root.setHistoryFilter("daily") }
                HistoryChoice { text: "QUOTE"; selected: root.historyFilter === "quote"; onClicked: root.setHistoryFilter("quote") }
                HistoryChoice { text: "SHELL"; selected: root.historyFilter === "shell"; onClicked: root.setHistoryFilter("shell") }
                HistoryChoice { text: "CODE"; selected: root.historyFilter === "code"; onClicked: root.setHistoryFilter("code") }
                HistoryChoice { text: "DRILL"; selected: root.historyFilter === "drill"; onClicked: root.setHistoryFilter("drill") }
                HistoryChoice { text: "CUSTOM"; selected: root.historyFilter === "custom"; onClicked: root.setHistoryFilter("custom") }
              }

              Item {
                width: parent.width
                height: Style.space(58)

                Text {
                  anchors.left: parent.left
                  anchors.top: parent.top
                  text: "RECENT WPM"
                  color: root.muted
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.caption
                  font.bold: true
                  font.letterSpacing: 1
                }

                Row {
                  anchors.left: parent.left
                  anchors.right: parent.right
                  anchors.bottom: parent.bottom
                  height: Style.space(48)
                  spacing: Style.space(3)

                  Repeater {
                    model: root.trendRuns

                    Rectangle {
                      required property var modelData
                      width: Math.max(3, (parent.width - parent.spacing * 19) / 20)
                      height: Math.max(2, parent.height * modelData.wpm / root.trendMaximum(root.trendRuns))
                      anchors.bottom: parent.bottom
                      radius: Math.min(width / 2, Style.space(2))
                      color: root.accent
                      opacity: 0.35 + 0.65 * modelData.accuracy / 100
                    }
                  }
                }

                Text {
                  visible: root.trendRuns.length === 0
                  anchors.centerIn: parent
                  text: "No results in this mode yet"
                  color: root.muted
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.bodySmall
                }
              }

              Row {
                width: parent.width
                spacing: Style.space(24)

                Column {
                  width: (parent.width - parent.spacing) * 0.5
                  spacing: Style.space(5)
                  Text {
                    text: "WEAK KEYS"
                    color: root.accent
                    font.family: root.fontFamily
                    font.pixelSize: Style.font.caption
                    font.bold: true
                    font.letterSpacing: 1
                  }
                  Text {
                    width: parent.width
                    text: root.mistakeSummary(root.stats.keyMistakes, 5)
                    color: root.foreground
                    font.family: root.fontFamily
                    font.pixelSize: Style.font.bodySmall
                    elide: Text.ElideRight
                  }
                }

                Column {
                  width: (parent.width - parent.spacing) * 0.5
                  spacing: Style.space(5)
                  Text {
                    text: "DIFFICULT PAIRS"
                    color: root.accent
                    font.family: root.fontFamily
                    font.pixelSize: Style.font.caption
                    font.bold: true
                    font.letterSpacing: 1
                  }
                  Text {
                    width: parent.width
                    text: root.mistakeSummary(root.stats.bigramMistakes, 4)
                    color: root.foreground
                    font.family: root.fontFamily
                    font.pixelSize: Style.font.bodySmall
                    elide: Text.ElideRight
                  }
                }
              }

              Row {
                width: parent.width
                spacing: Style.space(10)

                Text {
                  width: parent.width * 0.28
                  anchors.verticalCenter: parent.verticalCenter
                  text: "PREFERENCES"
                  color: root.muted
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.caption
                  font.bold: true
                  font.letterSpacing: 1
                }
                HistoryChoice {
                  text: "LIVE " + (root.showLiveStats ? "ON" : "OFF")
                  selected: root.showLiveStats
                  onClicked: root.toggleLiveStats()
                }
                HistoryChoice {
                  text: "GHOST " + (root.ghostEnabled ? "ON" : "OFF")
                  selected: root.ghostEnabled
                  onClicked: root.toggleGhost()
                }
                HistoryChoice {
                  text: "TYPE " + Math.round(root.fontScale * 100) + "%"
                  selected: false
                  onClicked: root.cycleFontScale()
                }
              }

              Text {
                text: "TEST HISTORY  /  " + root.historyFilter.toUpperCase()
                color: root.muted
                font.family: root.fontFamily
                font.pixelSize: Style.font.caption
                font.bold: true
                font.letterSpacing: 1
              }

              Flickable {
                id: historyFlick
                width: parent.width
                height: Math.min(Style.space(178), Math.max(Style.space(34), historyList.implicitHeight))
                contentWidth: width
                contentHeight: historyList.implicitHeight
                clip: true
                interactive: contentHeight > height
                boundsBehavior: Flickable.StopAtBounds

                Column {
                  id: historyList
                  width: historyFlick.width
                  spacing: Style.space(2)

                  Repeater {
                    model: root.historyRuns

                    Rectangle {
                      required property var modelData
                      required property int index
                      width: parent.width
                      height: Style.space(34)
                      radius: Math.max(2, Style.cornerRadius / 2)
                      color: index % 2 ? "transparent" : Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, 0.035)

                      Row {
                        anchors.fill: parent
                        anchors.leftMargin: Style.space(10)
                        anchors.rightMargin: Style.space(10)

                        HistoryCell { width: parent.width * 0.18; value: Content.modeLabel(modelData.mode); accentText: true }
                        HistoryCell { width: parent.width * 0.22; value: modelData.target || (modelData.duration + " seconds") }
                        HistoryCell { width: parent.width * 0.20; value: Math.round(modelData.wpm) + " WPM"; strong: true }
                        HistoryCell { width: parent.width * 0.18; value: Math.round(modelData.accuracy) + "% ACC" }
                        HistoryCell { width: parent.width * 0.22; value: modelData.date; alignRight: true }
                      }
                    }
                  }

                  Text {
                    visible: root.historyRuns.length === 0
                    width: parent.width
                    text: "Finish a test to begin your local history."
                    color: root.muted
                    font.family: root.fontFamily
                    font.pixelSize: Style.font.bodySmall
                    horizontalAlignment: Text.AlignHCenter
                  }
                }
              }
            }
          }
        }

        Row {
          width: parent.width
          height: Style.space(42)

          Text {
            width: parent.width * 0.72
            anchors.verticalCenter: parent.verticalCenter
            text: root.statsOpen ? "0-8 filters  /  ↑↓ history  /  l live stats  /  g ghost  /  f type size  /  esc returns"
              : root.phase === "results"
              ? (root.shareStatus || "results locked  /  ctrl+r retry  /  ctrl+s card  /  ctrl+c copy  /  ctrl+h history  /  esc exit")
              : "AI can take the dictation. Keep your fingers sharp.  /  h shows stats"
            color: root.shareStatus ? root.accent : root.muted
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            elide: Text.ElideMiddle
          }

          Text {
            width: parent.width * 0.28
            anchors.verticalCenter: parent.verticalCenter
            text: root.stats.totalTests + (root.stats.totalTests === 1 ? " local test" : " local tests")
            color: root.muted
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            horizontalAlignment: Text.AlignRight
          }
        }
      }
    }
  }

  FloatingWindow {
    id: statsWindow
    visible: root.opened && root.windowedStats
    title: "Typearchy · History"
    color: root.background
    implicitWidth: Style.space(980)
    implicitHeight: Style.space(720)
    minimumSize: Qt.size(Style.space(760), Style.space(620))

    onVisibleChanged: {
      if (!visible && root.opened && root.windowedStats)
        Qt.callLater(function() { root.dismiss() })
    }

    Rectangle {
      anchors.fill: parent
      color: root.background

      Rectangle {
        anchors.fill: parent
        color: root.accent
        opacity: 0.025
      }
    }

    FocusScope {
      id: statsKeyCatcher
      anchors.fill: parent
      focus: true

      Keys.onPressed: function(event) {
        if (event.key === Qt.Key_Escape) {
          root.dismiss()
          event.accepted = true
          return
        }
        var filters = ["all", "sprint", "words", "daily", "quote", "shell", "code", "drill", "custom"]
        var filterIndex = Number(event.text)
        if (event.key === Qt.Key_Down || event.key === Qt.Key_PageDown)
          windowHistoryFlick.contentY = Math.min(Math.max(0, windowHistoryFlick.contentHeight - windowHistoryFlick.height),
            windowHistoryFlick.contentY + Style.space(event.key === Qt.Key_PageDown ? 140 : 36))
        else if (event.key === Qt.Key_Up || event.key === Qt.Key_PageUp)
          windowHistoryFlick.contentY = Math.max(0,
            windowHistoryFlick.contentY - Style.space(event.key === Qt.Key_PageUp ? 140 : 36))
        else if (event.text >= "0" && event.text <= "8") {
          root.historyFilter = filters[filterIndex]
          windowHistoryFlick.contentY = 0
        } else if (event.text === "l" || event.text === "L") root.toggleLiveStats()
        else if (event.text === "g" || event.text === "G") root.toggleGhost()
        else if (event.text === "f" || event.text === "F") root.cycleFontScale()
        event.accepted = true
      }

      Column {
        anchors.fill: parent
        anchors.margins: Style.space(28)
        spacing: Style.space(12)

        Row {
          width: parent.width
          height: Style.space(48)

          Column {
            width: parent.width * 0.55
            spacing: Style.space(2)
            Text {
              text: "TYPEARCHY"
              color: root.foreground
              font.family: root.fontFamily
              font.pixelSize: Style.font.heading
              font.bold: true
              font.letterSpacing: 3
            }
            Text {
              text: "LOCAL HISTORY  /  " + root.historyFilter.toUpperCase()
              color: root.accent
              font.family: root.fontFamily
              font.pixelSize: Style.font.caption
              font.bold: true
              font.letterSpacing: 1.3
            }
          }

          Text {
            width: parent.width * 0.45
            anchors.verticalCenter: parent.verticalCenter
            text: "WINDOWED  /  SUPER+T FLOATS  /  LOCAL"
            color: root.muted
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            font.letterSpacing: 1
            horizontalAlignment: Text.AlignRight
          }
        }

        Rectangle { width: parent.width; height: 1; color: root.muted; opacity: 0.22 }

        Row {
          width: parent.width
          spacing: Style.space(16)
          HistoryMetric {
            label: "TODAY"
            value: Model.bestForDate(root.stats, Model.localDateKey(new Date())) > 0
              ? Math.round(Model.bestForDate(root.stats, Model.localDateKey(new Date()))) + " WPM" : "-"
          }
          HistoryMetric { label: "ALL TIME"; value: Math.round(root.stats.bestWpm || 0) + " WPM" }
          HistoryMetric { label: "STREAK"; value: (root.stats.streak || 0) + " DAYS" }
          HistoryMetric { label: "AVG ACC"; value: Model.recentAverage(root.stats, "accuracy", 10) + "%" }
        }

        Row {
          anchors.horizontalCenter: parent.horizontalCenter
          spacing: Style.space(4)
          HistoryChoice { text: "ALL"; selected: root.historyFilter === "all"; onClicked: { root.historyFilter = "all"; windowHistoryFlick.contentY = 0 } }
          HistoryChoice { text: "SPRINT"; selected: root.historyFilter === "sprint"; onClicked: { root.historyFilter = "sprint"; windowHistoryFlick.contentY = 0 } }
          HistoryChoice { text: "WORDS"; selected: root.historyFilter === "words"; onClicked: { root.historyFilter = "words"; windowHistoryFlick.contentY = 0 } }
          HistoryChoice { text: "DAILY"; selected: root.historyFilter === "daily"; onClicked: { root.historyFilter = "daily"; windowHistoryFlick.contentY = 0 } }
          HistoryChoice { text: "QUOTE"; selected: root.historyFilter === "quote"; onClicked: { root.historyFilter = "quote"; windowHistoryFlick.contentY = 0 } }
          HistoryChoice { text: "SHELL"; selected: root.historyFilter === "shell"; onClicked: { root.historyFilter = "shell"; windowHistoryFlick.contentY = 0 } }
          HistoryChoice { text: "CODE"; selected: root.historyFilter === "code"; onClicked: { root.historyFilter = "code"; windowHistoryFlick.contentY = 0 } }
          HistoryChoice { text: "DRILL"; selected: root.historyFilter === "drill"; onClicked: { root.historyFilter = "drill"; windowHistoryFlick.contentY = 0 } }
          HistoryChoice { text: "CUSTOM"; selected: root.historyFilter === "custom"; onClicked: { root.historyFilter = "custom"; windowHistoryFlick.contentY = 0 } }
        }

        Item {
          width: parent.width
          height: Style.space(90)

          Text {
            anchors.left: parent.left
            anchors.top: parent.top
              text: "RECENT WPM  /  LAST " + root.trendRuns.length
                + (root.trendRuns.length ? "  /  PEAK " + Math.round(root.trendMaximum(root.trendRuns)) : "")
            color: root.muted
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            font.bold: true
            font.letterSpacing: 1
          }

          Row {
            anchors.left: parent.left
            anchors.right: parent.right
            anchors.bottom: parent.bottom
            height: Style.space(66)
            spacing: Style.space(4)
            Repeater {
              model: root.trendRuns
              Rectangle {
                required property var modelData
                width: Math.max(3, (parent.width - parent.spacing * 19) / 20)
                height: Math.max(2, parent.height * modelData.wpm / root.trendMaximum(root.trendRuns))
                anchors.bottom: parent.bottom
                radius: Math.min(width / 2, Style.space(2))
                color: root.accent
                opacity: 0.3 + 0.7 * modelData.accuracy / 100
              }
            }
          }

          Text {
            visible: root.trendRuns.length === 0
            anchors.centerIn: parent
            text: "No results in this mode yet"
            color: root.muted
            font.family: root.fontFamily
            font.pixelSize: Style.font.bodySmall
          }
        }

        Row {
          width: parent.width
          spacing: Style.space(22)

          Column {
            width: parent.width * 0.33
            spacing: Style.space(4)
            Text { text: "WEAK KEYS"; color: root.accent; font.family: root.fontFamily; font.pixelSize: Style.font.caption; font.bold: true; font.letterSpacing: 1 }
            Text { width: parent.width; text: root.mistakeSummary(root.stats.keyMistakes, 5); color: root.foreground; font.family: root.fontFamily; font.pixelSize: Style.font.bodySmall; elide: Text.ElideRight }
          }
          Column {
            width: parent.width * 0.33
            spacing: Style.space(4)
            Text { text: "DIFFICULT PAIRS"; color: root.accent; font.family: root.fontFamily; font.pixelSize: Style.font.caption; font.bold: true; font.letterSpacing: 1 }
            Text { width: parent.width; text: root.mistakeSummary(root.stats.bigramMistakes, 4); color: root.foreground; font.family: root.fontFamily; font.pixelSize: Style.font.bodySmall; elide: Text.ElideRight }
          }
          Row {
            width: parent.width * 0.34 - parent.spacing * 2
            anchors.verticalCenter: parent.verticalCenter
            spacing: Style.space(4)
            HistoryChoice { text: "LIVE " + (root.showLiveStats ? "ON" : "OFF"); selected: root.showLiveStats; onClicked: root.toggleLiveStats() }
            HistoryChoice { text: "GHOST " + (root.ghostEnabled ? "ON" : "OFF"); selected: root.ghostEnabled; onClicked: root.toggleGhost() }
            HistoryChoice { text: "TYPE " + Math.round(root.fontScale * 100) + "%"; selected: false; onClicked: root.cycleFontScale() }
          }
        }

        Text {
          text: "TEST HISTORY"
          color: root.muted
          font.family: root.fontFamily
          font.pixelSize: Style.font.caption
          font.bold: true
          font.letterSpacing: 1
        }

        Flickable {
          id: windowHistoryFlick
          width: parent.width
          height: Math.max(Style.space(110), statsKeyCatcher.height - Style.space(420))
          contentWidth: width
          contentHeight: windowHistoryList.implicitHeight
          clip: true
          interactive: contentHeight > height
          boundsBehavior: Flickable.StopAtBounds

          Column {
            id: windowHistoryList
            width: windowHistoryFlick.width
            spacing: Style.space(2)

            Repeater {
              model: root.historyRuns
              Rectangle {
                required property var modelData
                required property int index
                width: parent.width
                height: Style.space(38)
                radius: Math.max(2, Style.cornerRadius / 2)
                color: index % 2 ? "transparent" : Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, 0.035)
                Row {
                  anchors.fill: parent
                  anchors.leftMargin: Style.space(10)
                  anchors.rightMargin: Style.space(10)
                  HistoryCell { width: parent.width * 0.18; value: Content.modeLabel(modelData.mode); accentText: true }
                  HistoryCell { width: parent.width * 0.22; value: modelData.target || (modelData.duration + " seconds") }
                  HistoryCell { width: parent.width * 0.20; value: Math.round(modelData.wpm) + " WPM"; strong: true }
                  HistoryCell { width: parent.width * 0.18; value: Math.round(modelData.accuracy) + "% ACC" }
                  HistoryCell { width: parent.width * 0.22; value: modelData.date; alignRight: true }
                }
              }
            }

            Text {
              visible: root.historyRuns.length === 0
              width: parent.width
              text: "Finish a test to begin your local history."
              color: root.muted
              font.family: root.fontFamily
              font.pixelSize: Style.font.bodySmall
              horizontalAlignment: Text.AlignHCenter
            }
          }
        }

        Row {
          width: parent.width
          Text {
            width: parent.width * 0.75
            text: "0-8 filters  /  ↑↓ history  /  l live  /  g ghost  /  f type size  /  esc closes"
            color: root.muted
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            elide: Text.ElideRight
          }
          Text {
            width: parent.width * 0.25
            text: root.stats.totalTests + (root.stats.totalTests === 1 ? " local test" : " local tests")
            color: root.muted
            font.family: root.fontFamily
            font.pixelSize: Style.font.caption
            horizontalAlignment: Text.AlignRight
          }
        }
      }
    }
  }

  component Metric: Column {
    property string label: ""
    property string value: ""
    spacing: Style.space(2)

    Text {
      anchors.right: parent.right
      text: label
      color: root.muted
      font.family: root.fontFamily
      font.pixelSize: Style.font.caption
      font.letterSpacing: 1
    }
    Text {
      anchors.right: parent.right
      text: value
      color: root.foreground
      font.family: root.fontFamily
      font.pixelSize: Style.font.body
      font.bold: true
    }
  }

  component Choice: Button {
    foreground: root.foreground
    active: selected
    bordered: false
    fontSize: Style.font.bodySmall
    horizontalPadding: Style.space(10)
    verticalPadding: Style.space(6)
  }

  component ResultAction: Button {
    width: (parent.width - parent.spacing * 3) / 4
    foreground: root.foreground
    bordered: true
    fontSize: Style.font.caption
    horizontalPadding: Style.space(8)
    verticalPadding: Style.space(6)
  }

  component PaceGraph: Item {
    property var samples: []
    property real referenceWpm: 0
    property real finalWpm: 0

    onSamplesChanged: graph.requestPaint()
    onReferenceWpmChanged: graph.requestPaint()
    onFinalWpmChanged: graph.requestPaint()
    onWidthChanged: graph.requestPaint()
    onHeightChanged: graph.requestPaint()

    Text {
      anchors.left: parent.left
      anchors.top: parent.top
      text: "WPM OVER TIME  /  1 SECOND SAMPLES"
      color: root.muted
      font.family: root.fontFamily
      font.pixelSize: Style.font.caption
      font.bold: true
      font.letterSpacing: 1
    }

    Text {
      anchors.right: parent.right
      anchors.top: parent.top
      text: referenceWpm > 0 ? "PB LINE  " + Math.round(referenceWpm) + " WPM" : "BASELINE RUN"
      color: referenceWpm > 0 && finalWpm > referenceWpm ? root.accent : root.muted
      font.family: root.fontFamily
      font.pixelSize: Style.font.caption
      font.bold: true
      font.letterSpacing: 1
    }

    Canvas {
      id: graph
      anchors.left: parent.left
      anchors.right: parent.right
      anchors.top: parent.top
      anchors.topMargin: Style.space(18)
      anchors.bottom: parent.bottom

      onPaint: {
        var ctx = getContext("2d")
        ctx.clearRect(0, 0, width, height)
        var values = Array.isArray(samples) ? samples.slice() : []
        if (values.length === 0) values = [0, finalWpm]
        else if (values.length === 1) values.unshift(values[0])
        var minimum = Math.max(0, Number(values[0]) || 0)
        var maximum = Math.max(1, referenceWpm, finalWpm)
        for (var index = 0; index < values.length; index++) {
          var sample = Number(values[index]) || 0
          minimum = Math.min(minimum, sample)
          maximum = Math.max(maximum, sample)
        }
        if (referenceWpm > 0) minimum = Math.min(minimum, referenceWpm)
        var spread = Math.max(1, maximum - minimum)
        var padding = Math.max(8, spread * 0.2)
        var floor = Math.max(0, minimum - padding)
        var ceiling = maximum + padding
        function graphY(value) {
          return height - (Number(value) - floor) / Math.max(1, ceiling - floor) * height
        }

        ctx.lineWidth = 1
        ctx.strokeStyle = String(root.muted)
        ctx.globalAlpha = 0.16
        for (var row = 1; row < 4; row++) {
          var gridY = height * row / 4
          ctx.beginPath()
          ctx.moveTo(0, gridY)
          ctx.lineTo(width, gridY)
          ctx.stroke()
        }

        if (referenceWpm > 0) {
          var referenceY = graphY(referenceWpm)
          ctx.globalAlpha = 0.45
          ctx.strokeStyle = String(root.muted)
          ctx.beginPath()
          ctx.moveTo(0, referenceY)
          ctx.lineTo(width, referenceY)
          ctx.stroke()
        }

        ctx.beginPath()
        for (var sampleIndex = 0; sampleIndex < values.length; sampleIndex++) {
          var x = values.length === 1 ? 0 : sampleIndex / (values.length - 1) * width
          var y = graphY(Number(values[sampleIndex]) || 0)
          if (sampleIndex === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.globalAlpha = 1
        ctx.strokeStyle = String(root.accent)
        ctx.lineWidth = Math.max(2, Style.space(2))
        ctx.stroke()

        var lastX = width
        var lastY = graphY(Number(values[values.length - 1]) || 0)
        ctx.globalAlpha = 0.14
        ctx.lineTo(lastX, height)
        ctx.lineTo(0, height)
        ctx.closePath()
        ctx.fillStyle = String(root.accent)
        ctx.fill()
        ctx.globalAlpha = 1

        ctx.beginPath()
        ctx.arc(lastX - 2, lastY, Math.max(3, Style.space(3)), 0, Math.PI * 2)
        ctx.fillStyle = String(root.accent)
        ctx.fill()
      }
    }
  }

  component HistoryChoice: Button {
    foreground: root.foreground
    active: selected
    bordered: false
    fontSize: Style.font.caption
    horizontalPadding: Style.space(8)
    verticalPadding: Style.space(5)
  }

  component ResultMetric: Column {
    property string label: ""
    property var value: ""
    width: (parent.width - parent.spacing * 3) / 4
    spacing: Style.space(4)

    Text {
      text: label
      color: root.muted
      font.family: root.fontFamily
      font.pixelSize: Style.font.caption
      font.letterSpacing: 1
    }
    Text {
      text: String(value)
      color: root.foreground
      font.family: root.fontFamily
      font.pixelSize: Style.font.body
      font.bold: true
    }
  }

  component HistoryMetric: Column {
    property string label: ""
    property string value: ""
    width: (parent.width - parent.spacing * 3) / 4
    spacing: Style.space(4)

    Text {
      text: label
      color: root.muted
      font.family: root.fontFamily
      font.pixelSize: Style.font.caption
      font.letterSpacing: 1
    }
    Text {
      text: value
      color: root.foreground
      font.family: root.fontFamily
      font.pixelSize: Style.font.body
      font.bold: true
    }
  }

  component HistoryCell: Item {
    property string value: ""
    property bool strong: false
    property bool accentText: false
    property bool alignRight: false

    height: parent.height

    Text {
      anchors.verticalCenter: parent.verticalCenter
      width: parent.width
      text: value
      color: accentText ? root.accent : root.foreground
      opacity: strong || accentText ? 1 : 0.72
      font.family: root.fontFamily
      font.pixelSize: Style.font.caption
      font.bold: strong || accentText
      horizontalAlignment: alignRight ? Text.AlignRight : Text.AlignLeft
      elide: Text.ElideRight
    }
  }
}
