import QtQuick
import QtQuick.Window
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui
import "Content.js" as Content
import "ContentEngine.js" as ContentEngine
import "TypearchyModel.js" as Model
import "LearningEngine.js" as Learning
import "PracticePassages.js" as Practice

Item {
  id: root

  property var shell: null
  property var manifest: null
  property bool standalone: false
  signal quitRequested()
  property bool paused: false
  property bool interrupted: false
  property real elapsedBeforePause: 0
  property bool confirmClose: false
  property bool statsWriting: false
  property bool quitAfterSave: false
  property string pendingChallengePayload: ""
  readonly property bool appActive: keyCatcher.Window.active
  onAppActiveChanged: if (standalone && !appActive && !competitionOpen) pausePractice()

  // Let the window manager choose placement for normal application windows.
  readonly property var focusedScreen: {
    return null
  }
  property var openScreen: null

  readonly property string pluginId: (manifest && manifest.id) || "dev.typearchy.game"
  readonly property string home: Quickshell.env("HOME")
  readonly property string stateDir: Quickshell.env("TYPEARCHY_STATE_DIR") || (Quickshell.env("XDG_STATE_HOME") || home + "/.local/state") + "/typearchy"
  readonly property string shareDir: home + "/Pictures/Typearchy"
  readonly property string exportDir: home + "/Documents/Typearchy"
  property string historyMessage: ""
  property string exportTarget: ""
  property string updateAvailable: ""
  readonly property string statePath: stateDir + (standalone ? "/desktop/stats.json" : "/stats.json")
  readonly property string quarantinePath: statePath + ".bad"
  readonly property string customDir: (Quickshell.env("XDG_DATA_HOME") || home + "/.local/share") + "/typearchy"
  readonly property string customPath: customDir + "/passages.txt"
  readonly property string publishPath: stateDir + "/publish.json"
  readonly property string cloudHelper: decodeURIComponent(Qt.resolvedUrl("bin/typearchy-cloud").toString().replace(/^file:\/\//, ""))

  property bool opened: false
  property bool competitionOpen: false
  property bool windowedStats: false
  property string mode: "sprint"
  property int duration: 30
  property string sprintStyle: "prose"
  property string codeLanguage: "bash"
  property var challenge: ({})
  property string prompt: ""
  property string typedText: ""
  property real promptLineY: 0
  property real promptRowHeight: 0
  property string phase: "ready"
  property bool statsOpen: false
  property string historyFilter: "all"
  property double startedAt: 0
  property double elapsedMs: 0
  property int totalKeypresses: 0
  property int incorrectKeypresses: 0
  property var learning: Learning.learningState()
  readonly property var practiceEvidence: Learning.learningProfile(root.stats.runs || [])
  property var keyMistakes: ({})
  property var bigramMistakes: ({})
  property var paceSamples: []
  property var customPassages: []
  property var stats: Model.emptyState()
  property bool statsLoaded: false
  property var pendingOpenPayload: null
  property var currentResult: null
  property var ghostRun: null
  property bool publishPending: false
  property string shareStatus: ""
  property string lastSharePath: ""
  property string profileStatus: "disconnected"
  property string profileHandle: ""
  property string profileCode: ""
  property string profileVisibility: "public"
  property string profileMessage: ""
  property bool profileDeleteArmed: false
  property string cloudAction: ""
  property string cloudTargetTimestamp: ""
  property string cloudTargetKey: ""
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
    if (standalone && opened) {
      window.minimized = false
      if (keyCatcher.Window.window) keyCatcher.Window.window.requestActivate()
      if (!payload.challenge && !payload.view) return
      if (phase === "running" || (competitionOpen && ["armed", "running", "finished"].indexOf(nativeChallenge.phase) >= 0)) {
        if (payload.challenge) pendingChallengePayload = JSON.stringify(payload)
        return
      }
    }
    root.openScreen = root.focusedScreen
    root.windowedStats = !standalone && payload.view === "stats"
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
    if (root.competitionOpen && ["armed", "running", "finished"].indexOf(nativeChallenge.phase) >= 0) {
      root.windowedStats = false
      nativeChallenge.refocus()
      return
    }
    if (payload.challenge && root.phase !== "running") {
      root.competitionOpen = true
      root.windowedStats = false
      nativeChallenge.open(String(payload.challenge), String(payload.ghost || ""))
      return
    }
    root.competitionOpen = false
    root.windowedStats = !standalone && payload.view === "stats"
    if (root.phase === "running") {
      // A test is in progress: re-summoning refocuses it instead of silently
      // discarding the run. Escape still abandons it deliberately.
      root.statsOpen = false
      root.checkProfileStatus()
      Qt.callLater(function() { keyCatcher.forceActiveFocus() })
      return
    }
    root.mode = Content.validMode(payload.mode || root.stats.settings.defaultMode)
    var requestedDuration = Number(payload.duration || root.stats.settings.duration)
    root.duration = [15, 30, 60].indexOf(requestedDuration) >= 0 ? requestedDuration : 30
    root.sprintStyle = Content.validSprintStyle(payload.sprintStyle || root.stats.settings.sprintStyle)
    root.codeLanguage = Content.validLanguage(payload.language || root.stats.settings.codeLanguage)
    root.resetTest()
    root.statsOpen = payload.view === "stats"
    root.checkProfileStatus()
    Qt.callLater(function() {
      if (root.windowedStats) statsKeyCatcher.forceActiveFocus()
      else keyCatcher.forceActiveFocus()
    })
  }

  function close() {
    nativeChallenge.stop()
    ticker.stop()
    sampleTimer.stop()
    profilePoll.stop()
    profileDeleteTimer.stop()
    root.profileDeleteArmed = false
    root.opened = false
    root.windowedStats = false
  }

  function dismiss() {
    if (standalone) { requestClose(); return }
    if (root.phase === "running") root.resetTest()
    if (root.shell && typeof root.shell.hide === "function") root.shell.hide(root.pluginId)
    else root.close()
  }

  function requestClose() {
    if (phase === "running" || (competitionOpen && (nativeChallenge.busy || nativeChallenge.phase === "running" || (nativeChallenge.phase === "finished" && !nativeChallenge.saved)))) {
      pausePractice(); confirmClose = true; window.visible = true
    } else exitApp()
  }

  function exitApp() {
    if (statsWriting) { quitAfterSave = true; return }
    root.close(); quitRequested()
  }

  function practiceElapsed() { return paused ? elapsedMs : elapsedBeforePause + Number(practiceClock.elapsedMs()) }
  function pausePractice() {
    if (phase !== "running" || paused || competitionOpen) return
    if (practiceExpired()) return
    elapsedMs = practiceElapsed(); paused = true; interrupted = true
    ticker.stop(); sampleTimer.stop()
  }
  function resumePractice() {
    if (!paused) return
    elapsedBeforePause = elapsedMs; practiceClock.restartMs(); paused = false
    ticker.start(); sampleTimer.start(); keyCatcher.forceActiveFocus()
  }
  function writeStats() {
    statsWriting = true
    statsFile.setText(JSON.stringify(root.stats, null, 2) + "\n")
  }

  function resetTest() {
    paused = false; interrupted = false; elapsedBeforePause = 0
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
      drillPersonalized: drillProfile.personalized,
      drillPassages: Practice.PASSAGES,
      customPassages: root.customPassages,
      generated: generated
    })
    root.ghostRun = Model.bestComparableRun(root.stats, root.challenge)
    root.prompt = root.challenge.prompt
    root.typedText = ""
    root.promptLineY = 0
    root.promptRowHeight = 0
    root.phase = "ready"
    root.startedAt = 0
    root.elapsedMs = 0
    root.totalKeypresses = 0
    root.incorrectKeypresses = 0
    root.learning = Learning.learningState()
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
    root.writeStats()
  }

  function updatePreference(name, value) {
    var next = Model.parseState(JSON.stringify(root.stats))
    next.settings[name] = value
    root.stats = next
    root.writeStats()
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

  function exportHistory() {
    if (exportProc.running) return
    var stamp = Model.localDateKey(new Date())
    root.exportTarget = root.exportDir + "/typearchy-history-" + stamp + ".json"
    root.historyMessage = "Exporting history..."
    exportProc.command = ["bash", "-c", "mkdir -p \"$2\" && cp -- \"$1\" \"$3\"", "--", root.statePath, root.exportDir, root.exportTarget]
    exportProc.running = true
  }

  function importHistory() {
    if (importPick.running) return
    root.historyMessage = "Choose a Typearchy history backup..."
    importPick.command = ["bash", "-c", "if command -v omarchy-file-select >/dev/null; then omarchy-file-select --title \"Import Typearchy history\" --extensions json; elif command -v zenity >/dev/null; then zenity --file-selection --title=\"Import Typearchy history\" --file-filter=\"*.json\"; else exit 3; fi"]
    importPick.running = true
  }

  function finishImport(raw) {
    var merged = Model.mergeHistory(root.stats, raw)
    if (merged.error) { root.historyMessage = merged.error; return }
    root.stats = merged.state
    root.writeStats()
    root.historyMessage = merged.added === 0 ? "Nothing new to import  /  every run was already in your history"
      : "Imported " + merged.added + (merged.added === 1 ? " run" : " runs") + "  /  " + root.stats.totalTests + " local tests"
  }

  function setHistoryFilter(filter) {
    root.historyFilter = filter === "all" || filter === "words" ? filter : Content.validMode(filter)
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
    Qt.callLater(function() { if (root.windowedStats) statsKeyCatcher.forceActiveFocus(); else keyCatcher.forceActiveFocus() })
  }

  function openRunResult(run) {
    if (!run || root.phase === "running") return
    root.currentResult = Model.normalizeRun(run)
    root.phase = "results"
    root.resultsShownAt = Date.now()
    root.statsOpen = false
    root.windowedStats = false
    Qt.callLater(function() { keyCatcher.forceActiveFocus() })
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
    practiceClock.restartMs()
    root.elapsedMs = 0
    ticker.start()
    sampleTimer.start()
  }

  function practiceExpired() {
    if (!paused && root.phase === "running" && root.isTimed && practiceElapsed() >= root.duration * 1000) { root.finishTest(true); return true }
    return false
  }

  function addCharacter(character) {
    if (paused) return
    if (root.practiceExpired()) return
    if (root.challenge.available === false || root.phase === "results" || root.typedText.length >= root.prompt.length) return
    if (root.phase === "ready") root.beginTest()
    var index = root.typedText.length
    var aligned = Model.alignCharacter(root.prompt, root.typedText, character)
    Learning.learningRecord(root.learning, aligned.expected, index > 0 ? root.prompt.charAt(index - 1) : "", aligned.correct)
    root.totalKeypresses++
    if (!aligned.correct) {
      root.incorrectKeypresses++
      var mistake = Model.addMistake(root.keyMistakes, root.bigramMistakes, aligned.expected,
        index > 0 ? root.prompt.charAt(index - 1) : "")
      root.keyMistakes = mistake.keys
      root.bigramMistakes = mistake.bigrams
    }
    root.typedText = Model.advanceLineBreaks(root.mode, root.prompt, aligned.text, character)
    if (!root.isTimed && root.typedText.length >= root.prompt.length) root.finishTest(true)
  }

  function eraseCharacter() {
    if (root.practiceExpired()) return
    if (root.phase === "results" || root.typedText.length === 0) return
    var next = root.typedText
    while (next.charAt(next.length - 1) === Model.ASSISTED_CHARACTER) next = next.slice(0, -1)
    root.typedText = next.slice(0, -1)
  }

  function eraseWord() {
    if (root.practiceExpired()) return
    if (root.phase === "results" || root.typedText.length === 0) return
    var next = root.typedText
    while (next.charAt(next.length - 1) === Model.ASSISTED_CHARACTER) next = next.slice(0, -1)
    root.typedText = next.slice(0, Model.eraseWordIndex(next))
  }

  function finishTest(completed) {
    if (root.phase === "results") return
    ticker.stop()
    sampleTimer.stop()
    root.elapsedMs = Math.max(250, root.startedAt > 0 ? practiceElapsed() : 250)
    if (root.isTimed) root.elapsedMs = Math.min(root.elapsedMs, root.duration * 1000)

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
      target: (root.challenge.detail || "") + (root.interrupted ? " / PAUSED PRACTICE" : ""),
      challengeKey: root.challenge.challengeKey || "",
      completed: completed !== false,
      interrupted: root.interrupted,
      contentVersion: root.challenge.version || "",
      language: root.challenge.language || "",
      sprintStyle: root.challenge.sprintStyle || "",
      drillKeys: root.challenge.drillKeys || [],
      drillBigrams: root.challenge.drillBigrams || [],
      targetErrors: Model.drillTargetErrors(root.challenge, root.keyMistakes, root.bigramMistakes),
      characters: root.correctChars,
      wpm: finalWpm,
      rawWpm: Model.wordsPerMinute(root.totalKeypresses, root.elapsedMs),
      accuracy: Model.accuracy(root.totalKeypresses, root.incorrectKeypresses),
      consistency: Model.consistency(root.paceSamples),
      errors: root.incorrectKeypresses,
      dailyId: root.challenge.challengeId || "",
      previousBestWpm: previousBest,
      personalBest: !root.interrupted && !!root.ghostRun && finalWpm > previousBest,
      learning: root.learning,
      keyMistakes: root.keyMistakes,
      bigramMistakes: root.bigramMistakes,
      pace: finalPace
    }
    root.currentResult = Model.normalizeRun(run)
    root.stats = Model.recordRun(root.stats, run)
    writeStats()
    root.resultsShownAt = Date.now()
    root.phase = "results"
    Qt.callLater(function() { keyCatcher.forceActiveFocus() })
  }

  function exportResultImage() {
    if (!root.currentResult || root.phase !== "results" || root.exportingCard) return
    root.shareStatus = "Creating local card..."
    root.exportingCard = true
    var stamp = root.currentResult.timestamp.replace(/[:.]/g, "-")
    var path = root.shareDir + "/typearchy-" + stamp + ".png"
    root.lastSharePath = path
    Qt.callLater(function() {
      resultCard.grabToImage(function(result) {
        root.exportingCard = false
        if (!result || !result.saveToFile(path)) {
          root.shareStatus = "Image export failed. Your result is still available."
          return
        }
        copyImageProc.command = ["bash", "-c", "wl-copy --type image/png < \"$1\"", "--", path]
        copyImageProc.running = true
      }, Qt.size(Math.round(resultCard.width * 1.6), Math.round(resultCard.height * 1.6)))
    })
  }

  function shareResult() { root.publishRun(root.currentResult) }

  function copyResultText() { root.publishRun(root.currentResult) }

  function applyPublishedRun(timestamp, slug, pinned) {
    root.stats = Model.updateRunPublication(root.stats, timestamp, slug, pinned, root.cloudTargetKey)
    root.writeStats()
    if (root.currentResult && root.currentResult.timestamp === timestamp) {
      root.currentResult = Model.normalizeRun(root.stats.runs.find(function(run) { return run.timestamp === timestamp }) || root.currentResult)
    }
  }

  function startCloudAction(action, args) {
    if (cloudProc.running) {
      if (action !== "status") root.profileMessage = "Profile action already running"
      return
    }
    root.cloudAction = action
    cloudProc.command = [root.cloudHelper].concat(args || [])
    cloudProc.running = true
  }

  function checkProfileStatus() {
    root.startCloudAction("status", ["status"])
  }

  function connectProfile() {
    root.profileStatus = "pending"
    root.profileMessage = "Opening secure connection page..."
    root.startCloudAction("connect", ["connect"])
  }

  function recoverProfile() {
    root.profileStatus = "pending"
    root.profileMessage = "Opening recovery page..."
    root.startCloudAction("recover", ["recover"])
  }

  function connectBrowser() {
    if (root.profileStatus !== "connected") return
    root.profileMessage = "Opening typearchy.com in your browser..."
    root.startCloudAction("browser", ["browser"])
  }

  function disconnectProfile() {
    root.profileDeleteArmed = false
    root.startCloudAction("disconnect", ["disconnect"])
  }

  function toggleProfileVisibility() {
    if (root.profileStatus !== "connected") return
    root.profileMessage = root.profileVisibility === "private" ? "Publishing profile..." : "Hiding profile..."
    root.startCloudAction("visibility", ["visibility", root.profileVisibility === "private" ? "public" : "private"])
  }

  function deleteProfile() {
    if (root.profileStatus !== "connected") return
    if (!root.profileDeleteArmed) {
      root.profileDeleteArmed = true
      root.profileMessage = "Delete profile and public runs? Press CONFIRM"
      profileDeleteTimer.restart()
      return
    }
    profileDeleteTimer.stop()
    root.profileMessage = "Deleting public profile..."
    root.startCloudAction("delete-profile", ["delete-profile"])
  }

  function openProfile() {
    if (!root.profileHandle) return
    openCustomProc.command = ["xdg-open", "https://typearchy.com/u/" + root.profileHandle]
    openCustomProc.running = true
  }

  function publishRun(run) {
    if (run && run.interrupted) { root.profileMessage = "Paused practice stays local. Complete an uninterrupted run to share a comparable time."; root.shareStatus = root.profileMessage; return }
    if (!run || root.publishPending || cloudProc.running) return
    if (root.profileStatus !== "connected") {
      root.connectProfile()
      return
    }
    if (run.mode === "custom") {
      root.profileMessage = "Custom passages stay local"
      return
    }
    if (run.publicSlug) {
      copyLinkProc.command = ["bash", "-c", "printf '%s' \"$1\" | wl-copy", "--", "https://typearchy.com/r/" + run.publicSlug]
      copyLinkProc.running = true
      return
    }
    root.cloudTargetTimestamp = run.timestamp
    root.cloudTargetKey = run.challengeKey || ""
    var payload = {
      timestamp: run.timestamp,
      clientRunId: "omarchy:" + run.timestamp + ":" + run.mode,
      contentVersion: run.contentVersion || "unknown",
      mode: run.mode,
      challengeKey: run.challengeKey,
      target: run.target || (run.duration + " seconds"),
      duration: run.duration,
      wpm: run.wpm,
      rawWpm: run.rawWpm,
      accuracy: run.accuracy,
      consistency: run.consistency,
      errors: run.errors,
      pace: run.pace,
      theme: { bg: root.background.toString(), panel: Qt.lighter(root.background, 1.12).toString(), ink: root.foreground.toString(), muted: root.muted.toString(), accent: root.accent.toString(), error: root.urgent.toString() }
    }
    root.publishPending = true
    publishFile.setText(JSON.stringify(payload) + "\n")
    root.profileMessage = "Publishing score summary..."
  }

  function toggleRunPin(run) {
    if (!run || !run.publicSlug || root.profileStatus !== "connected") return
    root.cloudTargetTimestamp = run.timestamp
    root.cloudTargetKey = run.challengeKey || ""
    root.profileMessage = run.publicPinned ? "Removing profile pin..." : "Pinning run to profile..."
    root.startCloudAction("pin", ["pin", run.publicSlug, run.publicPinned ? "false" : "true"])
  }

  function deletePublishedRun(run) {
    if (!run || !run.publicSlug || root.profileStatus !== "connected") return
    root.cloudTargetTimestamp = run.timestamp
    root.cloudTargetKey = run.challengeKey || ""
    root.profileMessage = "Removing public run..."
    root.startCloudAction("delete", ["delete", run.publicSlug])
  }

  function handleCloudResponse(exitCode) {
    var raw = String(cloudOutput.text || "").trim()
    var errorText = String(cloudErrors.text || "").trim()
    var response = {}
    try { response = JSON.parse(raw || errorText || "{}") || {} } catch (error) {}
    if (exitCode !== 0 || response.error) {
      root.profileMessage = String(response.error || "typearchy.com unavailable  /  local practice still works")
      if (root.cloudAction === "status" || root.cloudAction === "connect" || root.cloudAction === "recover") {
        root.profileStatus = "disconnected"
        profilePoll.stop()
      }
      return
    }
    if (root.cloudAction === "publish") {
      root.applyPublishedRun(root.cloudTargetTimestamp, response.slug, false)
      root.profileMessage = "Published  /  typearchy.com/r/" + response.slug
      return
    }
    if (root.cloudAction === "pin") {
      root.applyPublishedRun(root.cloudTargetTimestamp, undefined, response.pinned === true)
      root.profileMessage = response.pinned ? "Pinned to public profile" : "Removed from public profile"
      return
    }
    if (root.cloudAction === "delete") {
      root.applyPublishedRun(root.cloudTargetTimestamp, "", false)
      root.profileMessage = "Public run removed. Local result kept."
      return
    }
    if (root.cloudAction === "delete-profile") {
      root.stats = Model.clearRunPublications(root.stats)
      root.writeStats()
      if (root.currentResult) {
        root.currentResult = Model.normalizeRun(root.stats.runs.find(function(run) {
          return run.timestamp === root.currentResult.timestamp
        }) || root.currentResult)
      }
      root.profileStatus = "disconnected"
      root.profileHandle = ""
      root.profileCode = ""
      root.profileDeleteArmed = false
      root.profileMessage = "Public profile deleted. Local history kept."
      profilePoll.stop()
      return
    }
    if (root.cloudAction === "browser") {
      root.profileMessage = "Confirm in browser  /  " + String(response.code || "") + "  /  code lasts 10 minutes"
      return
    }
    if (root.cloudAction === "visibility") {
      root.profileVisibility = response.visibility === "private" ? "private" : "public"
      root.profileMessage = root.profileVisibility === "private"
        ? "Profile hidden from typearchy.com"
        : "Profile is public at typearchy.com/u/" + root.profileHandle
      return
    }
    root.profileStatus = String(response.status || "disconnected")
    root.profileHandle = String(response.handle || "")
    root.profileCode = String(response.code || "")
    root.profileVisibility = response.visibility === "private" ? "private" : "public"
    if (response.latestClient && response.clientVersion && Model.compareVersions(response.clientVersion, response.latestClient) < 0)
      root.updateAvailable = String(response.latestClient)
    if (root.profileStatus === "connected") root.profileMessage = "Connected as @" + root.profileHandle + (root.updateAvailable ? "  /  update " + root.updateAvailable + " available" : "")
    else if (root.profileStatus === "pending") root.profileMessage = root.profileCode ? "Finish in browser  /  " + root.profileCode : "Finish recovery in browser"
    else if (root.profileStatus === "unreachable") root.profileMessage = "typearchy.com unreachable  /  still connected, local practice works"
    else root.profileMessage = ""
    if (root.profileStatus === "pending") profilePoll.start()
    else profilePoll.stop()
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
      return "start typing  /  line breaks advance automatically  /  tab changes mode"
    if (root.mode === "shell")
      return "start typing  /  1 2 3 changes duration  /  enter types return"
    if (root.mode === "code")
      return "start typing  /  1 2 3 changes duration  /  enter types return"
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
    if (Model.stateNeedsQuarantine(raw)) quarantineFile.setText(String(raw))
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
      var sourcePosition = Math.min(root.typedText.length, root.prompt.length)
      var cursorRect = promptText.positionToRectangle(Model.documentPosition(root.prompt, sourcePosition))
      var nextLineY = Math.max(0, cursorRect.y)
      if (Math.abs(nextLineY - root.promptLineY) < 1) return
      root.promptRowHeight = Math.abs(nextLineY - root.promptLineY)
      root.promptLineY = nextLineY
      var nextContentY = Math.max(0, nextLineY - root.promptRowHeight)
      promptFlick.contentY = Math.min(promptFlick.contentHeight - promptFlick.height, nextContentY)
    })
  }

  Component.onCompleted: {
    initProc.running = true
    // Register links only from the installed plugin, never from a QA worktree.
    linkSetup.running = !standalone && root.cloudHelper === root.home + "/.config/omarchy/plugins/" + root.pluginId + "/bin/typearchy-cloud"
  }
  Process {
    id: linkSetup
    command: [decodeURIComponent(Qt.resolvedUrl("bin/typearchy-setup-links").toString().replace(/^file:\/\//, ""))]
  }

  Process {
    id: initProc
    command: ["bash", "-c", "mkdir -p \"$1\" \"$2\" \"$3\" && touch \"$4\"", "--",
      root.standalone ? root.stateDir + "/desktop" : root.stateDir, root.shareDir, root.customDir, root.customPath]
    onExited: {
      statsFile.reload()
      customFile.reload()
    }
  }

  Process {
    id: copyImageProc
    onExited: function(exitCode) {
      root.shareStatus = exitCode === 0 ? "Card copied  /  " + root.lastSharePath
        : "Copy failed  /  card saved at " + root.lastSharePath
    }
  }
  Process {
    id: copyTextProc
    onExited: function(exitCode) {
      root.shareStatus = exitCode === 0 ? "Result text copied" : "Copy failed. Is wl-copy installed?"
    }
  }
  Process {
    id: copyLinkProc
    onExited: function(exitCode) {
      root.profileMessage = exitCode === 0 ? "Public link copied" : "Copy failed. Is wl-copy installed?"
    }
  }
  Process { id: openCustomProc }
  Process {
    id: exportProc
    onExited: function(exitCode) {
      root.historyMessage = exitCode === 0 ? "Exported  /  " + root.exportTarget : "Export failed  /  check that " + root.exportDir + " is writable"
    }
  }
  Process {
    id: importPick
    stdout: StdioCollector { id: importPickOutput; waitForEnd: true }
    onExited: function(exitCode) {
      var chosen = String(importPickOutput.text || "").trim().split("\n")[0]
      if (exitCode === 3) { chosen = root.exportDir + "/import.json"; root.historyMessage = "No file chooser found  /  reading " + chosen }
      else if (exitCode !== 0 || !chosen) { root.historyMessage = "Import cancelled"; return }
      importFile.path = chosen
      importFile.reload()
    }
  }
  FileView {
    id: importFile
    printErrors: false
    onLoaded: root.finishImport(text())
    onLoadFailed: root.historyMessage = "Could not read that file  /  choose a stats.json or exported history backup"
  }

  Process {
    id: cloudProc
    stdout: StdioCollector { id: cloudOutput; waitForEnd: true }
    stderr: StdioCollector { id: cloudErrors; waitForEnd: true }
    onExited: function(exitCode) { root.handleCloudResponse(exitCode) }
  }

  FileView {
    id: statsFile
    path: root.statePath
    atomicWrites: true
    printErrors: false
    onLoaded: root.loadStats(text())
    onLoadFailed: root.loadStats("")
    onSaved: { root.statsWriting = false; if (root.quitAfterSave) root.exitApp() }
    onSaveFailed: { root.statsWriting = false; root.quitAfterSave = false; root.shareStatus = "Could not save local history. Keep the app open and check available storage." }
  }

  FileView {
    id: quarantineFile
    path: root.quarantinePath
    atomicWrites: true
    printErrors: false
  }

  FileView {
    id: publishFile
    onSaved: { if (root.publishPending) { root.publishPending = false; root.startCloudAction("publish", ["publish", root.publishPath]) } }
    onSaveFailed: { root.publishPending = false; root.profileMessage = "Could not save this result for sharing. Try again." }
    path: root.publishPath
    atomicWrites: true
    printErrors: false
  }

  Timer {
    id: profilePoll
    interval: 2200
    repeat: true
    onTriggered: {
      if (!root.opened || root.profileStatus !== "pending") stop()
      else root.checkProfileStatus()
    }
  }

  Timer {
    id: profileDeleteTimer
    interval: 8000
    onTriggered: {
      root.profileDeleteArmed = false
      if (root.profileStatus === "connected") root.profileMessage = "Connected as @" + root.profileHandle
    }
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

  ElapsedTimer { id: practiceClock }

  Timer {
    id: ticker
    interval: 50
    repeat: true
    onTriggered: {
      root.elapsedMs = root.practiceElapsed()
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

  FloatingWindow {
    id: window
    visible: root.opened && !root.windowedStats
    screen: root.openScreen
    title: "Typearchy"
    implicitWidth: 1120
    implicitHeight: 800
    minimumSize: Qt.size(900, 640)
    color: root.background
    onClosed: if (root.standalone) root.requestClose(); else root.close()

    Row {
      visible: root.standalone
      anchors.top: parent.top; anchors.right: parent.right; anchors.margins: 8
      spacing: 8; z: 50
      Button { id: historyButton; text: "History"; enabled: root.phase !== "running" && !root.competitionOpen; onClicked: root.toggleStats() }
      Button { text: window.fullscreen ? "Windowed · F11" : "Fullscreen · F11"; onClicked: { window.fullscreen = !window.fullscreen; if (root.competitionOpen) nativeChallenge.refocus(); else keyCatcher.forceActiveFocus() } }
      Button { text: "Close"; onClicked: root.requestClose() }
    }

    Row {
      visible: !!root.pendingChallengePayload
      anchors.left: parent.left; anchors.top: parent.top; anchors.margins: 8
      z: 50
      Button {
        text: root.phase === "running" || (root.competitionOpen && ["armed", "running"].indexOf(nativeChallenge.phase) >= 0) ? "Challenge queued for after this run" : "Open queued challenge"
        enabled: root.phase !== "running" && !nativeChallenge.busy && (!root.competitionOpen || ["armed", "running"].indexOf(nativeChallenge.phase) < 0)
        onClicked: { var payload = root.pendingChallengePayload; root.pendingChallengePayload = ""; root.competitionOpen = false; root.open(payload) }
      }
    }

    Shortcut {
      sequence: "F11"
      enabled: root.standalone
      context: Qt.WindowShortcut
      onActivated: window.fullscreen = !window.fullscreen
    }

    Rectangle {
      id: pauseDialog
      visible: root.paused || root.confirmClose
      onVisibleChanged: if (visible) Qt.callLater(function() { keepPlaying.forceActiveFocus() })
      anchors.fill: parent; z: 100
      color: root.background
      MouseArea { anchors.fill: parent }
      Column {
        anchors.centerIn: parent; width: Math.min(parent.width - 80, 620); spacing: 24
        Text { width: parent.width; text: root.confirmClose ? "Close Typearchy?" : "Practice paused"; color: root.foreground; font.family: root.fontFamily; font.pixelSize: 30 }
        Text {
          width: parent.width; wrapMode: Text.Wrap; color: root.muted; font.family: root.fontFamily; font.pixelSize: 16
          text: root.confirmClose ? (root.competitionOpen ? "An unfinished online race cannot be paused. Completed results are kept locally for recovery." : "Your current practice is paused. Close to discard this unfinished run.")
            : "Pick up where you left off. This run will be marked as paused practice and kept separate from uninterrupted personal bests."
        }
        Row {
          spacing: 20
          Button {
            id: keepPlaying
            Keys.onReturnPressed: clicked()
            Keys.onEnterPressed: clicked()
            Keys.onEscapePressed: clicked()
            text: root.confirmClose ? "Keep playing" : "Resume · Enter"; bordered: true; onClicked: { root.confirmClose = false; root.resumePractice(); if (root.competitionOpen) nativeChallenge.refocus() } }
          Button { text: root.confirmClose ? "Close app" : "Start over"; bordered: true; enabled: !nativeChallenge.busy; onClicked: { if (root.confirmClose) root.exitApp(); else root.resetTest() } }
        }
      }
    }

    NativeChallenge {
      id: nativeChallenge
      anchors.fill: parent
      anchors.topMargin: root.standalone ? 52 : 0
      z: 20
      visible: root.competitionOpen
      helper: root.cloudHelper
      stateDir: root.stateDir
      onExitRequested: { root.competitionOpen = false; Qt.callLater(function() { keyCatcher.forceActiveFocus() }) }
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

    Item {
      id: keyCatcher
      visible: !root.competitionOpen
      anchors.fill: parent
      focus: true
      anchors.topMargin: root.standalone ? 52 : 0
      Keys.priority: Keys.BeforeItem
      Keys.onPressed: function(event) {
        if (root.standalone && event.key === Qt.Key_F11) { window.fullscreen = !window.fullscreen; event.accepted = true; return }
        if (root.standalone && event.key === Qt.Key_Escape && window.fullscreen) { window.fullscreen = false; event.accepted = true; return }
        if (root.paused || root.confirmClose) { event.accepted = true; return }
        if (root.standalone && event.key === Qt.Key_Escape && !root.statsOpen) { root.pausePractice(); event.accepted = true; return }
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
          else if (event.text === "e" || event.text === "E") root.exportHistory()
          else if (event.text === "i" || event.text === "I") root.importHistory()
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
          var durationMode = root.mode === "sprint" || root.mode === "shell" || root.mode === "code"
          if (durationMode && event.text === "1") { root.chooseNumber(0); event.accepted = true; return }
          if (durationMode && event.text === "2") { root.chooseNumber(1); event.accepted = true; return }
          if (durationMode && event.text === "3") { root.chooseNumber(2); event.accepted = true; return }
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

        var typingModifiers = event.modifiers & ~Qt.KeypadModifier
        var altGr = (typingModifiers & Qt.ControlModifier) && (typingModifiers & Qt.AltModifier)
        var plainModifier = typingModifiers === Qt.NoModifier || typingModifiers === Qt.ShiftModifier || altGr
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
            visible: root.statsOpen || root.phase === "ready" || (root.showLiveStats && root.phase !== "results")

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
              Choice { id: codeChoice; text: "CODE"; selected: root.mode === "code"; onClicked: root.setMode("code") }
              Choice { text: "DRILL"; selected: root.mode === "drill"; onClicked: root.setMode("drill") }
              Choice { text: "CHALLENGES"; selected: false; onClicked: { root.competitionOpen = true; nativeChallenge.open("", "") } }
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
              Rectangle {
                visible: root.mode === "sprint"
                anchors.verticalCenter: parent.verticalCenter
                width: Math.max(1, Style.normalBorderWidth)
                height: Style.space(18)
                color: root.muted
                opacity: 0.35
              }
              Choice {
                visible: root.mode === "sprint"
                text: "WORDS"
                selected: root.sprintStyle === "words"
                onClicked: root.setSprintStyle("words")
              }
              Choice {
                visible: root.mode === "sprint"
                text: "PROSE"
                selected: root.sprintStyle === "prose"
                onClicked: root.setSprintStyle("prose")
              }
            }

            Row {
              anchors.horizontalCenter: parent.horizontalCenter
              spacing: Style.space(7)
              visible: root.phase === "ready" && root.mode === "code"

              Choice { text: "BASH"; selected: root.codeLanguage === "bash"; onClicked: root.setLanguage("bash") }
              Choice { text: "PYTHON"; selected: root.codeLanguage === "python"; onClicked: root.setLanguage("python") }
              Choice { text: "JS"; selected: root.codeLanguage === "javascript"; onClicked: root.setLanguage("javascript") }
              Choice { text: "RUST"; selected: root.codeLanguage === "rust"; onClicked: root.setLanguage("rust") }
              Choice { text: "RUBY"; selected: root.codeLanguage === "ruby"; onClicked: root.setLanguage("ruby") }
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
              // Show whole lines only. A half-visible fourth line reads as clipping.
              height: Math.min(promptText.contentHeight,
                Math.round(promptText.contentHeight / Math.max(1, promptText.lineCount)) * (root.mode === "code" || root.mode === "shell" ? 4 : 3) + Style.space(2))
              contentWidth: width
              contentHeight: promptText.contentHeight
              clip: true
              boundsBehavior: Flickable.StopAtBounds
              interactive: false

              Behavior on contentY {
                SmoothedAnimation {
                  duration: 170
                  velocity: -1
                  maximumEasingTime: 70
                }
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
                : (root.standalone ? "esc pauses  /  backspace corrects  /  ctrl+r restarts" : "esc exits  /  backspace corrects  /  ctrl+r restarts")
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
            height: Math.min(parent.height, Style.space(520))
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
              clip: true
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
                    text: root.currentResult ? Model.comparison(root.currentResult).label : ""
                    color: root.currentResult && root.currentResult.personalBest ? root.accent : root.muted
                    font.family: root.fontFamily
                    font.pixelSize: Style.font.caption
                    font.bold: true
                    font.letterSpacing: 1
                  }

                  Text {
                    anchors.right: parent.right
                    text: root.currentResult ? Model.comparison(root.currentResult).value : ""
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
                  width: parent.width - resultStatusText.width - Style.space(16)
                  text: root.practiceEvidence.keys.length
                    ? root.practiceEvidence.keys.slice(0, 3).map(function(row) { return row.key.toUpperCase() + "  " + row.errors + "/" + row.attempts + " MISSES" }).join("   ")
                    : "BUILD A STEADY RHYTHM. REPEATED TROUBLE SPOTS APPEAR HERE."
                  color: root.muted
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.caption
                  font.letterSpacing: 1
                  elide: Text.ElideRight
                }

                Text {
                  id: resultStatusText
                  width: Math.min(parent.width * 0.6, implicitWidth) + Style.space(16)
                  text: root.currentResult ? Model.resultStatus(root.currentResult) : "LOCAL RESULT  /  TYPEARCHY.COM"
                  color: root.currentResult && root.currentResult.publicSlug ? root.accent : root.muted
                  font.family: root.fontFamily
                  font.pixelSize: Style.font.caption
                  font.letterSpacing: 1
                  horizontalAlignment: Text.AlignRight
                  elide: Text.ElideMiddle
                }
              }

              Flow {
                visible: !root.exportingCard
                width: parent.width
                spacing: Style.space(8)

                ResultAction { text: "PRACTICE"; visible: Model.drillProfile(root.stats, 12).personalized; onClicked: root.setMode("drill") }
                ResultAction { text: "RETRY  CTRL+R"; onClicked: root.resetTest() }
                ResultAction {
                  text: root.currentResult && root.currentResult.publicSlug ? "COPY LINK" : (root.profileStatus === "connected" ? "SHARE RESULT  CTRL+S" : "CONNECT TO SHARE")
                  onClicked: root.publishRun(root.currentResult)
                }
                ResultAction {
                  text: root.currentResult && root.currentResult.publicPinned ? "UNPIN" : "PIN"
                  enabled: root.currentResult && root.currentResult.publicSlug && root.profileStatus === "connected"
                  onClicked: root.toggleRunPin(root.currentResult)
                }
                ResultAction {
                  text: "REMOVE"
                  enabled: root.currentResult && root.currentResult.publicSlug && root.profileStatus === "connected"
                  onClicked: root.deletePublishedRun(root.currentResult)
                }
                ResultAction { text: "EXPORT IMAGE"; onClicked: root.exportResultImage() }
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
              clip: true
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
                HistoryMetric { label: "AVG ACC"; value: Math.round(Model.recentAverage(root.stats, "accuracy", 10)) + "%" }
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
                      width: Math.max(3, (parent.width - parent.spacing * Math.max(0, root.trendRuns.length - 1)) / Math.max(1, root.trendRuns.length))
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
                HistoryChoice { text: "EXPORT"; selected: false; onClicked: root.exportHistory() }
                HistoryChoice { text: "IMPORT"; selected: false; onClicked: root.importHistory() }
              }

              ProfileSettings { width: parent.width }

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
                      activeFocusOnTab: true
                      Keys.onReturnPressed: root.openRunResult(modelData)
                      Keys.onSpacePressed: root.openRunResult(modelData)
                      Accessible.role: Accessible.ListItem
                      Accessible.name: Content.modeLabel(modelData.mode) + ", " + (modelData.target || modelData.duration + " seconds")
                        + ", " + Math.round(modelData.wpm) + " words per minute, " + Math.round(modelData.accuracy) + " percent, " + modelData.date + (Model.runBadge(modelData) ? ", " + Model.runBadge(modelData).toLowerCase() : ", local only")
                      Accessible.onPressAction: root.openRunResult(modelData)

                      Rectangle {
                        anchors.fill: parent
                        radius: parent.radius
                        color: "transparent"
                        border.width: 1
                        border.color: root.accent
                        visible: parent.activeFocus
                      }

                      MouseArea {
                        anchors.fill: parent
                        cursorShape: Qt.PointingHandCursor
                        onClicked: root.openRunResult(modelData)
                      }

                      Row {
                        anchors.fill: parent
                        anchors.leftMargin: Style.space(10)
                        anchors.rightMargin: Style.space(10)

                        HistoryCell { width: parent.width * 0.16; value: Content.modeLabel(modelData.mode); accentText: true }
                        HistoryCell { width: parent.width * 0.24; value: (modelData.target || (modelData.duration + " seconds")).replace(" / PAUSED PRACTICE", "") }
                        HistoryCell { width: parent.width * 0.16; value: Math.round(modelData.wpm) + " WPM"; strong: true }
                        HistoryCell { width: parent.width * 0.14; value: Math.round(modelData.accuracy) + "% ACC" }
                        HistoryCell { width: parent.width * 0.12; value: Model.runBadge(modelData); accentText: Model.runBadge(modelData) === "PUBLIC" || Model.runBadge(modelData) === "PINNED" }
                        HistoryCell { width: parent.width * 0.18; value: modelData.date; alignRight: true }
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
            text: root.statsOpen ? (root.historyMessage || "0-8 filters  /  e export  /  i import  /  l g f preferences  /  esc returns")
              : root.phase === "results"
              ? (root.shareStatus || Model.nextAction(root.currentResult, { connected: root.profileStatus === "connected", drillReady: Model.drillProfile(root.stats, 12).personalized }))
              : "AI can take the dictation. Keep your fingers sharp.  /  h shows stats"
            color: root.shareStatus || (root.statsOpen && root.historyMessage) ? root.accent : root.muted
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
    screen: root.openScreen
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
        else if (event.text === "e" || event.text === "E") root.exportHistory()
        else if (event.text === "i" || event.text === "I") root.importHistory()
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
          HistoryMetric { label: "AVG ACC"; value: Math.round(Model.recentAverage(root.stats, "accuracy", 10)) + "%" }
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
                width: Math.max(3, (parent.width - parent.spacing * Math.max(0, root.trendRuns.length - 1)) / Math.max(1, root.trendRuns.length))
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
            HistoryChoice { text: "EXPORT"; selected: false; onClicked: root.exportHistory() }
            HistoryChoice { text: "IMPORT"; selected: false; onClicked: root.importHistory() }
          }
        }

        ProfileSettings { width: parent.width }

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
                activeFocusOnTab: true
                Keys.onReturnPressed: root.openRunResult(modelData)
                Keys.onSpacePressed: root.openRunResult(modelData)
                Accessible.role: Accessible.ListItem
                Accessible.name: Content.modeLabel(modelData.mode) + ", " + (modelData.target || modelData.duration + " seconds")
                  + ", " + Math.round(modelData.wpm) + " words per minute, " + Math.round(modelData.accuracy) + " percent, " + modelData.date
                Accessible.onPressAction: root.openRunResult(modelData)

                Rectangle {
                  anchors.fill: parent
                  radius: parent.radius
                  color: "transparent"
                  border.width: 1
                  border.color: root.accent
                  visible: parent.activeFocus
                }

                MouseArea {
                  anchors.fill: parent
                  cursorShape: Qt.PointingHandCursor
                  onClicked: root.openRunResult(modelData)
                }
                Row {
                  anchors.fill: parent
                  anchors.leftMargin: Style.space(10)
                  anchors.rightMargin: Style.space(10)
                  HistoryCell { width: parent.width * 0.16; value: Content.modeLabel(modelData.mode); accentText: true }
                  HistoryCell { width: parent.width * 0.24; value: (modelData.target || (modelData.duration + " seconds")).replace(" / PAUSED PRACTICE", "") }
                  HistoryCell { width: parent.width * 0.16; value: Math.round(modelData.wpm) + " WPM"; strong: true }
                  HistoryCell { width: parent.width * 0.14; value: Math.round(modelData.accuracy) + "% ACC" }
                  HistoryCell { width: parent.width * 0.12; value: Model.runBadge(modelData); accentText: Model.runBadge(modelData) === "PUBLIC" || Model.runBadge(modelData) === "PINNED" }
                  HistoryCell { width: parent.width * 0.18; value: modelData.date; alignRight: true }
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
            text: root.historyMessage || "0-8 filters  /  e export  /  i import  /  l g f preferences  /  esc closes"
            color: root.historyMessage ? root.accent : root.muted
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
    Accessible.role: Accessible.Button
    Accessible.name: text
    Accessible.onPressAction: clicked()
  }

  component ResultAction: Button {
    width: Math.max(Style.space(125), (parent.width - parent.spacing * 5) / 6)
    foreground: root.foreground
    bordered: true
    fontSize: Style.font.caption
    horizontalPadding: Style.space(8)
    verticalPadding: Style.space(6)
    Accessible.role: Accessible.Button
    Accessible.name: text
    Accessible.onPressAction: clicked()
  }

  component ProfileSettings: Rectangle {
    height: Style.space(42)
    radius: Math.max(2, Style.cornerRadius / 2)
    color: Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, 0.028)
    border.width: 1
    border.color: Qt.rgba(root.foreground.r, root.foreground.g, root.foreground.b, 0.08)

    Row {
      anchors.fill: parent
      anchors.leftMargin: Style.space(10)
      anchors.rightMargin: Style.space(8)
      spacing: Style.space(7)

      Text {
        width: Math.max(Style.space(210), parent.width - actionButtons.width - parent.spacing)
        anchors.verticalCenter: parent.verticalCenter
        text: "PUBLIC PROFILE  /  " + (root.profileMessage || (root.profileStatus === "connected" ? "@" + root.profileHandle : "CREATE A HANDLE TO SHARE RESULTS"))
        color: root.profileStatus === "connected" ? root.accent : root.muted
        font.family: root.fontFamily
        font.pixelSize: Style.font.caption
        font.bold: true
        font.letterSpacing: 1
        elide: Text.ElideRight
      }

      Row {
        id: actionButtons
        anchors.verticalCenter: parent.verticalCenter
        spacing: Style.space(4)
        HistoryChoice {
          visible: root.profileStatus === "connected"
          text: "OPEN"
          selected: false
          onClicked: root.openProfile()
        }
        HistoryChoice {
          text: root.profileStatus === "connected" ? "DISCONNECT" : (root.profileStatus === "pending" ? "CHECK" : "CREATE / CONNECT")
          selected: root.profileStatus === "connected"
          onClicked: root.profileStatus === "connected" ? root.disconnectProfile()
            : (root.profileStatus === "pending" ? root.checkProfileStatus() : root.connectProfile())
        }
        HistoryChoice {
          visible: root.profileStatus === "connected"
          text: "BROWSER"
          selected: false
          Accessible.description: "Connect this profile in your web browser without a recovery code"
          onClicked: root.connectBrowser()
        }
        HistoryChoice {
          visible: root.profileStatus === "connected"
          text: root.profileVisibility === "private" ? "MAKE PUBLIC" : "MAKE PRIVATE"
          selected: false
          onClicked: root.toggleProfileVisibility()
        }
        HistoryChoice {
          visible: root.profileStatus === "connected"
          text: root.profileDeleteArmed ? "CONFIRM" : "DELETE"
          selected: root.profileDeleteArmed
          onClicked: root.deleteProfile()
        }
        HistoryChoice {
          visible: root.profileStatus !== "connected"
          text: "RECOVER"
          selected: false
          onClicked: root.recoverProfile()
        }
      }
    }
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
    Accessible.role: Accessible.Button
    Accessible.name: text
    Accessible.onPressAction: clicked()
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
