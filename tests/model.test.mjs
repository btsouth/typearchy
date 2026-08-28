import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"

function loadLibrary(path) {
  const source = fs.readFileSync(new URL(path, import.meta.url), "utf8")
    .replace(/^\.pragma library\s*/, "")
  const library = { console, Date, Math, JSON, Array, String, Number, isFinite }
  vm.createContext(library)
  vm.runInContext(source, library)
  return library
}

const model = loadLibrary("../TypearchyModel.js")
const content = loadLibrary("../Content.js")

assert.equal(model.STATE_VERSION, 5)
assert.equal(model.dateKey(new Date("2026-08-28T23:00:00Z")), "2026-08-28")
assert.match(model.localDateKey(new Date()), /^\d{4}-\d{2}-\d{2}$/)
assert.equal(new Set(content.WORDS).size, content.WORDS.length)
assert.ok(content.WORDS.length >= 300)
assert.ok(content.DAILY_PASSAGES.length >= 30)
assert.ok(content.SHELL_CHALLENGES.length >= 8)
assert.ok(content.QUOTES.length >= 20)
assert.ok(content.QUOTE_RELAYS.length >= 8)
assert.ok(content.MODES.includes("custom"))
for (const language of ["bash", "python", "javascript", "rust"])
  assert.ok(content.CODE_CHALLENGES[language].length >= 8)

const dailyMorning = content.buildChallenge({ mode: "daily", now: new Date("2026-08-28T01:00:00Z"), nonce: 1 })
const dailyEvening = content.buildChallenge({ mode: "daily", now: new Date("2026-08-28T20:00:00Z"), nonce: 999 })
const dailyTomorrow = content.buildChallenge({ mode: "daily", now: new Date("2026-08-29T20:00:00Z"), nonce: 1 })
assert.equal(dailyMorning.prompt, dailyEvening.prompt)
assert.equal(dailyMorning.challengeId, dailyEvening.challengeId)
assert.equal(dailyMorning.challengeKey, `daily:${dailyMorning.challengeId}`)
assert.notEqual(dailyMorning.challengeId, dailyTomorrow.challengeId)
assert.ok(dailyMorning.prompt.trim().split(/\s+/).length >= 70)
assert.ok(dailyMorning.prompt.split(/[.!?]+/).filter((sentence) => sentence.trim()).length >= 6)

const generated = content.buildChallenge({ mode: "sprint", sprintStyle: "words", duration: 60, nonce: "variety" }).prompt.split(" ")
assert.equal(generated.length, 330)
assert.equal(new Set(generated).size, 330)
const shortSprint = content.buildChallenge({ mode: "sprint", sprintStyle: "words", duration: 30, nonce: "fast-runway" }).prompt.split(" ")
assert.equal(shortSprint.length, 165)
assert.equal(new Set(shortSprint).size, 165)
const proseSprint = content.buildChallenge({ mode: "sprint", sprintStyle: "prose", duration: 60, nonce: "grammar" })
assert.equal(proseSprint.sprintStyle, "prose")
assert.ok(proseSprint.prompt.length >= 1080)
assert.match(proseSprint.prompt, /[.!?]/)
const drill = content.buildChallenge({ mode: "drill", drillKeys: ["x", "z"], drillBigrams: ["t→h"], nonce: "drill-variety" })
assert.equal(drill.mode, "drill")
assert.ok(drill.prompt.split(/\s+/).length >= 65)
assert.match(drill.prompt, /[.!?]/)
assert.match(drill.detail, /x \/ z \/ th/)
assert.match(drill.challengeKey, /^drill:x-z-th:/)
assert.equal(content.buildChallenge({ mode: "sprint", duration: 15 }).targetKind, "time")
assert.match(content.buildChallenge({ mode: "sprint", sprintStyle: "words", duration: 15 }).challengeKey, /^sprint:words:15:/)
assert.match(content.buildChallenge({ mode: "sprint", sprintStyle: "prose", duration: 15 }).challengeKey, /^sprint:prose:15:/)
assert.equal(content.validMode("words"), "sprint")
assert.equal(content.validMode("focus"), "drill")
assert.equal(content.modeLabel("words"), "WORDS")

const quote = content.buildChallenge({ mode: "quote", nonce: 3 })
assert.equal(quote.author, "Multiple voices")
assert.match(quote.challengeKey, /^quote-relay:/)
assert.equal(quote.segments.length, 4)
assert.equal(quote.prompt.split("\n").length, 4)
assert.ok(quote.prompt.split(/\s+/).length >= 35)
assert.equal(quote.segments[0].start, 0)
assert.equal(quote.segments[3].total, 4)
assert.ok(content.QUOTES.some(entry => entry.shortAuthor === "DHH"))
for (const relay of content.QUOTE_RELAYS) {
  assert.equal(new Set(relay.quotes).size, 4)
  const built = content.buildQuoteRelay(relay)
  assert.equal(built.segments.length, 4)
  assert.equal(built.prompt.split("\n").length, 4)
  assert.ok(built.prompt.split(/\s+/).length >= 35)
}
const relayKeys = new Set()
for (let nonce = 0; nonce < 40; nonce++)
  relayKeys.add(content.buildChallenge({ mode: "quote", nonce }).challengeKey)
assert.equal(relayKeys.size, content.QUOTE_RELAYS.length)
for (const duration of [15, 30, 60]) {
  const minimumCharacters = Math.max(360, duration * 16)
  const shellChallenge = content.buildChallenge({ mode: "shell", duration, nonce: 1 })
  assert.equal(shellChallenge.targetKind, "time")
  assert.equal(shellChallenge.targetValue, duration)
  assert.ok(shellChallenge.prompt.length >= minimumCharacters)
  assert.match(shellChallenge.prompt, /\n\n/)
  assert.match(shellChallenge.challengeKey, new RegExp(`^shell:${duration}:`))
  for (const language of ["bash", "python", "javascript", "rust"]) {
    const codeChallenge = content.buildChallenge({ mode: "code", language, duration, nonce: 1 })
    assert.equal(codeChallenge.targetKind, "time")
    assert.equal(codeChallenge.targetValue, duration)
    assert.equal(codeChallenge.language, language)
    assert.ok(codeChallenge.prompt.length >= minimumCharacters)
    assert.match(codeChallenge.prompt, /\n\n/)
    assert.match(codeChallenge.challengeKey, new RegExp(`^code:${language}:${duration}:`))
  }
}
const customPassages = content.parseCustomPassages("First custom passage.\n\nSecond custom passage.\nwith another line.\n")
assert.equal(customPassages.length, 2)
const custom = content.buildChallenge({ mode: "custom", customPassages, nonce: 4 })
assert.equal(custom.available, true)
assert.match(custom.challengeKey, /^custom:/)
assert.equal(content.buildChallenge({ mode: "custom", customPassages: [] }).available, false)

const codeVariants = new Set()
for (let nonce = 0; nonce < 30; nonce++)
  codeVariants.add(content.buildChallenge({ mode: "code", language: "python", nonce }).prompt)
assert.ok(codeVariants.size >= content.CODE_CHALLENGES.python.length)

assert.equal(model.correctCharacters("hello", "hxllo"), 4)
assert.equal(model.documentPosition("one\ntwo", 3), 3)
assert.equal(model.documentPosition("one\ntwo", 4), 5)
assert.equal(model.documentPosition("a\tb", 2), 5)
assert.deepEqual(
  JSON.parse(JSON.stringify(model.alignCharacter("one two", "one", "t"))),
  { text: "one\u0000t", expected: " ", correct: false, recovered: true }
)
assert.deepEqual(
  JSON.parse(JSON.stringify(model.alignCharacter("hello", "he", "e"))),
  { text: "he", expected: "l", correct: false, recovered: true }
)
assert.deepEqual(
  JSON.parse(JSON.stringify(model.alignCharacter("hello", "he", "x"))),
  { text: "hex", expected: "l", correct: false, recovered: false }
)
assert.equal(model.advanceLineBreaks("quote", "one\ntwo", "one", "e"), "one\u0001")
assert.equal(model.advanceLineBreaks("code", "one\ntwo", "one", "e"), "one")
assert.equal(model.advanceLineBreaks("code", "one\n\ntwo", "one\n", "\n"), "one\n\u0001")
assert.equal(model.advanceLineBreaks("shell", "one\ntwo", "one\n", "\n"), "one\n")
assert.equal(
  model.advanceLineBreaks("code", "build() {\n\tlocal path=$1", "build() {\n", "\n"),
  "build() {\n\u0001"
)
assert.equal(
  model.advanceLineBreaks("shell", "if ready; then\n  deploy", "if ready; then\n", "\n"),
  "if ready; then\n\u0001\u0001"
)
const indentedCodePrompt = "build_manifest() {\n\tlocal path=$1"
const enteredCodeBreak = model.alignCharacter(indentedCodePrompt, "build_manifest() {", "\n")
const advancedCodeBreak = model.advanceLineBreaks("code", indentedCodePrompt, enteredCodeBreak.text, "\n")
assert.equal(enteredCodeBreak.correct, true)
assert.equal(advancedCodeBreak, "build_manifest() {\n\u0001")
assert.equal(model.alignCharacter(indentedCodePrompt, advancedCodeBreak, "l").correct, true)
assert.equal(model.correctCharacters("one two", "one\u0000two"), 6)
assert.equal(model.correctCharacters("one\ntwo", "one\u0001two"), 6)
assert.match(model.renderedPrompt("one\ntwo", "one\u0001", {
  normal: "#ffffff", dim: "#777777", error: "#ff0000", cursor: "#ffffff", background: "#000000"
}), /color:#ffffff/)
assert.equal(model.wordsPerMinute(150, 30000), 60)
assert.equal(model.rawWordsPerMinute(175, 30000), 70)
assert.equal(model.accuracy(100, 3), 97)
assert.equal(model.consistency([60, 60, 60]), 100)
assert.equal(model.eraseWordIndex("one two"), 4)
assert.equal(model.eraseWordIndex("one two   "), 4)
const spaceCursor = model.renderedPrompt("one two", "one", {
  normal: "#ffffff", dim: "#777777", error: "#ff0000", cursor: "#ffffff", background: "#000000"
})
assert.doesNotMatch(spaceCursor, /&nbsp;/)
assert.match(spaceCursor, /background-color:#ffffff/)
assert.equal(model.resultAction("r", true, 1200, false), "retry")
assert.equal(model.resultAction("s", true, 1200, false), "share")
assert.equal(model.resultAction("c", true, 1200, false), "copy")
assert.equal(model.resultAction("h", true, 1200, false), "history")
assert.equal(model.resultAction("r", false, 1200, false), "")
assert.equal(model.resultAction("r", true, 200, false), "")
assert.equal(model.resultAction("r", true, 1200, true), "")
assert.equal(model.paceSparkline([60, 70, 80]), "▁▄█")
assert.equal(model.paceSparkline([60]), "")

const mistake = model.addMistake({}, {}, "x", "e")
assert.equal(mistake.keys.x, 1)
assert.equal(mistake.bigrams["e→x"], 1)

let state = model.emptyState()
state = model.recordRun(state, {
  timestamp: "2026-08-28T12:00:00Z",
  date: "2026-08-28",
  mode: "daily",
  duration: 30,
  target: "#240",
  challengeKey: "daily:240",
  contentVersion: content.VERSION,
  characters: 200,
  wpm: 80,
  rawWpm: 84,
  accuracy: 97,
  consistency: 92,
  errors: 3,
  dailyId: "240",
  keyMistakes: { x: 2 },
  bigramMistakes: { "e→x": 1 },
  pace: [72, 80, 86]
})
assert.equal(state.totalTests, 1)
assert.equal(state.bestWpm, 80)
assert.equal(state.streak, 1)
assert.equal(state.keyMistakes.x, 2)
assert.deepEqual(Array.from(model.weakKeys(state, 4)), ["x"])
assert.equal(model.dailyRun(state, "240").wpm, 80)
assert.equal(model.bestComparableRun(state, { challengeKey: "daily:240" }).wpm, 80)
assert.equal(model.paceAt(model.latestRun(state), 2100), 80)

state = model.recordRun(state, {
  timestamp: "2026-08-29T12:00:00Z",
  date: "2026-08-29",
  mode: "sprint",
  duration: 30,
  target: "30 seconds",
  challengeKey: "sprint:30",
  characters: 230,
  wpm: 92,
  rawWpm: 95,
  accuracy: 98,
  consistency: 94,
  errors: 2
})
assert.equal(state.totalTests, 2)
assert.equal(state.bestWpm, 92)
assert.equal(state.streak, 2)
assert.equal(model.bestForDate(state, "2026-08-28"), 80)
assert.equal(model.modeBest(state, "daily"), 80)
assert.equal(model.recentAverage(state, "wpm", 2), 86)
assert.equal(model.filteredRuns(state, "daily", 10).length, 1)
assert.equal(model.recentTrend(state, "all", 10)[0].wpm, 80)
assert.match(model.shareText(model.latestRun(state)), /92 WPM/)
assert.match(model.shareText(model.latestRun(state)), /TYPEARCHY\.COM/)
assert.match(model.shareText(model.latestRun(state)), /BEAT THIS RUN/)
assert.match(model.shareText(model.normalizeRun({ mode: "sprint", duration: 30, wpm: 80, accuracy: 98, pace: [60, 70, 80] })), /PACE  ▁▄█/)
assert.match(model.shareText(model.normalizeRun({ mode: "quote", target: "CRAFT", wpm: 70, accuracy: 98 })), /QUOTE RELAY CRAFT/)

const personalBest = model.normalizeRun({
  mode: "sprint",
  duration: 30,
  target: "30 seconds",
  challengeKey: "sprint:30",
  wpm: 100,
  accuracy: 99,
  personalBest: true
})
assert.match(model.shareText(personalBest), /NEW PERSONAL BEST/)

state = model.recordRun(state, {
  timestamp: "2026-09-03T12:00:00Z",
  date: "2026-09-03",
  mode: "sprint",
  duration: 60,
  target: "60 seconds",
  challengeKey: "sprint:60",
  wpm: 50,
  rawWpm: 55,
  accuracy: 95,
  consistency: 80,
  errors: 5
})
assert.equal(state.streak, 1)
assert.equal(model.parseState("not json").totalTests, 0)

const drillProfile = model.drillProfile(state, 12)
assert.equal(drillProfile.keys[0], "x")
assert.equal(drillProfile.bigrams[0], "e→x")
assert.equal(model.drillTargetErrors({ drillKeys: ["x"], drillBigrams: ["e→x"] }, { x: 2 }, { "e→x": 1 }), 3)

for (const version of [1, 2, 3, 4]) {
  const migrated = model.parseState(JSON.stringify({
    version,
    runs: [],
    bestWpm: 70,
    totalTests: 4,
    streak: 2,
    lastPlayedDate: "2026-08-27",
    settings: { showLiveStats: false }
  }))
  assert.equal(migrated.version, 5)
  assert.equal(migrated.bestWpm, 70)
  assert.equal(migrated.settings.defaultMode, "sprint")
  assert.equal(migrated.settings.showLiveStats, false)
  assert.equal(migrated.settings.ghostEnabled, true)
  assert.equal(migrated.settings.sprintStyle, "prose")
}

const migratedWordsMode = model.parseState(JSON.stringify({
  version: 3,
  runs: [],
  settings: { defaultMode: "words", sprintStyle: "words" }
}))
assert.equal(migratedWordsMode.settings.defaultMode, "sprint")
assert.equal(migratedWordsMode.settings.sprintStyle, "words")

const migratedFocusMode = model.parseState(JSON.stringify({
  version: 4,
  runs: [],
  settings: { defaultMode: "focus" }
}))
assert.equal(migratedFocusMode.settings.defaultMode, "drill")

for (let index = 0; index < 505; index++) {
  state = model.recordRun(state, {
    timestamp: `2026-09-03T12:00:${String(index % 60).padStart(2, "0")}Z`,
    date: "2026-09-03",
    mode: "sprint",
    duration: 15,
    target: "15 seconds",
    challengeKey: "sprint:15",
    wpm: 40,
    rawWpm: 42,
    accuracy: 98,
    consistency: 90,
    errors: 1
  })
}
assert.equal(state.runs.length, 500)

console.log("Typearchy model and content tests passed")
