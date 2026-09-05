// Generated from CompetitionEngine.js by bin/sync-competition-engine.mjs.
// This engine is deliberately independent of clocks, storage, and UI.
// A competitive client records events; every client and the server replays the
// same events through this code. Existing free-practice rules are unchanged.
var COMPETITION_VERSION = "competition-1"
var MAX_EVENTS = 24000
var MAX_DURATION_MS = 900000

function competitionRules(value) {
  if (!value || value.version !== COMPETITION_VERSION || value.finish !== "passage"
      || value.correction !== "required" || typeof value.autoIndent !== "boolean")
    throw new Error("Unsupported challenge rules")
  return { version: COMPETITION_VERSION, finish: "passage", correction: "required", autoIndent: value.autoIndent }
}

function competitionState(passage, rules) {
  competitionRules(rules)
  if (typeof passage !== "string" || passage.length < 40 || passage.length > 4000
      || passage !== passage.normalize("NFC") || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(passage)
      || passage.trim().length < 20 || /[\r\t]/.test(passage))
    throw new Error("Invalid challenge passage")
  return {
    passage: Array.from(passage), rules: rules, typed: [], assisted: [],
    correct: 0, wrong: 0, assistedCount: 0, presses: 0, errors: 0, lastAt: -1,
    events: 0, finishedAt: null, progress: []
  }
}

function competitionStep(state, event) {
  if (state.finishedAt !== null) throw new Error("Attempt is already finished")
  if (!event || !Number.isInteger(event.at) || event.at < 0
      || event.at < state.lastAt || event.at > MAX_DURATION_MS
      || state.events >= MAX_EVENTS)
    throw new Error("Invalid attempt timing")
  if (state.events === 0 && (event.type !== "input" || event.at !== 0))
    throw new Error("Attempt must begin with input at time zero")
  if (event.type !== "input" && event.type !== "backspace" && event.type !== "word")
    throw new Error("Invalid input event")
  if (event.type === "input" && (typeof event.text !== "string"
      || Array.from(event.text).length !== 1 || /[\u0000-\u0009\u000b-\u001f\u007f]/.test(event.text)))
    throw new Error("Each input event must contain one character")

  if (event.type === "input") {
    state.presses++
    var index = state.typed.length
    if (index >= state.passage.length) {
      state.errors++
    } else {
      state.typed.push(event.text)
      state.assisted.push(false)
      if (event.text === state.passage[index]) state.correct++
      else { state.wrong++; state.errors++ }
      if (event.text === "\n" && event.text === state.passage[index] && state.rules.autoIndent) {
        while (state.passage[state.typed.length] === " ") {
          state.typed.push(" ")
          state.assisted.push(true)
          state.assistedCount++
        }
      }
    }
  } else {
    var removeTo = Math.max(0, state.typed.length - 1)
    while (removeTo > 0 && state.assisted[removeTo]) removeTo--
    if (event.type === "word") {
      removeTo = state.typed.length
      while (removeTo > 0 && /\s/.test(state.typed[removeTo - 1])) removeTo--
      while (removeTo > 0 && !/\s/.test(state.typed[removeTo - 1])) removeTo--
    }
    while (state.typed.length > removeTo) {
      var last = state.typed.length - 1
      if (state.assisted[last]) state.assistedCount--
      else {
        if (state.typed[last] === state.passage[last]) state.correct--
        else state.wrong--
      }
      state.typed.pop()
      state.assisted.pop()
    }
  }
  state.lastAt = event.at
  state.events++
  if (state.typed.length === state.passage.length && state.wrong === 0) state.finishedAt = event.at
  // Public playback contains position and time only, never the entered text.
  // At most one sample per 250ms, plus the finish. Corrections may move backward.
  var position = state.correct + state.assistedCount
  var previous = state.progress.length ? state.progress[state.progress.length - 1] : null
  if (!previous || event.at - previous[0] >= 250 || state.finishedAt !== null)
    state.progress.push([event.at, position])
  return state
}

function competitionResult(state) {
  if (state.finishedAt === null || state.finishedAt < 1000)
    throw new Error("Complete the passage before submitting")
  return {
    durationMs: state.finishedAt,
    wpm: Math.round(state.correct * 120000 / state.finishedAt) / 10,
    rawWpm: Math.round(state.presses * 120000 / state.finishedAt) / 10,
    accuracy: Math.round((state.presses - state.errors) * 1000 / state.presses) / 10,
    errors: state.errors, characters: state.correct,
    progress: state.progress.map(function(sample) { return sample.slice() })
  }
}

function competitionReplay(passage, rules, events) {
  if (!Array.isArray(events) || !events.length || events.length > MAX_EVENTS)
    throw new Error("Invalid attempt recording")
  var state = competitionState(passage, rules)
  events.forEach(function(event) { competitionStep(state, event) })
  return competitionResult(state)
}

function competitionPosition(samples, elapsed) {
  if (!samples || !samples.length || elapsed < samples[0][0]) return 0
  var low = 0
  var high = samples.length - 1
  while (low < high) {
    var middle = Math.ceil((low + high) / 2)
    if (samples[middle][0] <= elapsed) low = middle
    else high = middle - 1
  }
  var left = samples[low]
  var right = samples[Math.min(low + 1, samples.length - 1)]
  if (left[0] === right[0]) return left[1]
  return left[1] + (right[1] - left[1]) * Math.min(1, (elapsed - left[0]) / (right[0] - left[0]))
}

export { COMPETITION_VERSION, MAX_EVENTS, MAX_DURATION_MS, competitionRules, competitionState, competitionStep, competitionResult, competitionReplay, competitionPosition }
