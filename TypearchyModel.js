.pragma library

var STATE_VERSION = 6
var MODES = ["sprint", "daily", "quote", "shell", "code", "drill", "custom"]
var MISSING_CHARACTER = "\u0000"
var ASSISTED_CHARACTER = "\u0001"

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value))
}

function round(value, places) {
  var scale = Math.pow(10, places === undefined ? 0 : places)
  return Math.round(value * scale) / scale
}

function pad2(value) {
  return String(value).padStart(2, "0")
}

function dateKey(date) {
  var value = date || new Date()
  return value.getUTCFullYear() + "-" + pad2(value.getUTCMonth() + 1) + "-" + pad2(value.getUTCDate())
}

function localDateKey(date) {
  var value = date || new Date()
  return value.getFullYear() + "-" + pad2(value.getMonth() + 1) + "-" + pad2(value.getDate())
}

function correctCharacters(prompt, typed) {
  var limit = Math.min(String(prompt || "").length, String(typed || "").length)
  var count = 0
  for (var i = 0; i < limit; i++) if (prompt.charAt(i) === typed.charAt(i)) count++
  return count
}

function documentPosition(prompt, sourcePosition) {
  var source = String(prompt || "")
  var limit = clamp(Number(sourcePosition) || 0, 0, source.length)
  var position = limit
  for (var i = 0; i < limit; i++) {
    if (source.charAt(i) === "\n") position++
    else if (source.charAt(i) === "\t") position += 3
  }
  return position
}

function alignCharacter(prompt, typed, character) {
  var source = String(prompt || "")
  var entered = String(typed || "")
  var value = String(character || "")
  var index = entered.length
  var expected = source.charAt(index)

  if (!value || !expected)
    return { text: entered, expected: expected, correct: false, recovered: false }
  if (value === expected)
    return { text: entered + value, expected: expected, correct: true, recovered: false }
  if (index + 1 < source.length && value === source.charAt(index + 1))
    return { text: entered + MISSING_CHARACTER + value, expected: expected, correct: false, recovered: true }
  if (index > 0 && value === source.charAt(index - 1))
    return { text: entered, expected: expected, correct: false, recovered: true }
  return { text: entered + value, expected: expected, correct: false, recovered: false }
}

function advanceLineBreaks(mode, prompt, typed, character) {
  var source = String(prompt || "")
  var next = String(typed || "")
  var technical = mode === "shell" || mode === "code"
  if (technical && character !== "\n") return next
  while (source.charAt(next.length) === "\n") next += ASSISTED_CHARACTER
  if (technical) {
    while (source.charAt(next.length) === " " || source.charAt(next.length) === "\t")
      next += ASSISTED_CHARACTER
  }
  return next
}

function wordsPerMinute(correctChars, elapsedMs) {
  if (!(elapsedMs > 0)) return 0
  return round((correctChars / 5) / (elapsedMs / 60000), 1)
}

function rawWordsPerMinute(keypresses, elapsedMs) {
  if (!(elapsedMs > 0)) return 0
  return round((keypresses / 5) / (elapsedMs / 60000), 1)
}

function accuracy(keypresses, incorrectKeypresses) {
  if (keypresses < 1) return 100
  return round(clamp((keypresses - incorrectKeypresses) / keypresses * 100, 0, 100), 1)
}

function consistency(samples) {
  if (!samples || samples.length < 2) return 100
  var total = 0
  for (var i = 0; i < samples.length; i++) total += Number(samples[i]) || 0
  var mean = total / samples.length
  if (!(mean > 0)) return 0
  var squared = 0
  for (var j = 0; j < samples.length; j++) {
    var delta = (Number(samples[j]) || 0) - mean
    squared += delta * delta
  }
  var deviation = Math.sqrt(squared / samples.length)
  return round(clamp(100 - deviation / mean * 100, 0, 100), 1)
}

function emptyState() {
  return {
    version: STATE_VERSION,
    runs: [],
    bestWpm: 0,
    totalTests: 0,
    streak: 0,
    lastPlayedDate: "",
    keyMistakes: {},
    bigramMistakes: {},
    settings: {
      defaultMode: "sprint",
      duration: 30,
      sprintStyle: "prose",
      codeLanguage: "bash",
      showLiveStats: true,
      ghostEnabled: true,
      fontScale: 1
    }
  }
}

function normalizeCounts(value) {
  var out = {}
  if (!value || typeof value !== "object" || Array.isArray(value)) return out
  for (var key in value) {
    var count = Math.max(0, Math.floor(Number(value[key]) || 0))
    if (count > 0) out[String(key)] = count
  }
  return out
}

function capCounts(value, limit) {
  var counts = normalizeCounts(value)
  var keys = Object.keys(counts)
  if (keys.length <= limit) return counts
  keys.sort(function(left, right) { return counts[right] - counts[left] })
  var capped = {}
  for (var index = 0; index < limit; index++) capped[keys[index]] = counts[keys[index]]
  return capped
}

function normalizedMode(mode) {
  var value = String(mode || "sprint")
  if (value === "words") return "sprint"
  if (value === "focus") return "drill"
  return MODES.indexOf(value) >= 0 ? value : "sprint"
}

function fallbackChallengeKey(value) {
  var mode = normalizedMode(value.mode)
  if (mode === "daily") return "daily:" + String(value.dailyId || value.target || "")
  if (mode === "sprint") {
    var sprintStyle = String(value.sprintStyle || "")
    return "sprint:" + (sprintStyle ? sprintStyle + ":" : "") + Math.max(0, Math.round(Number(value.duration) || 0))
  }
  if (mode === "code") return "code:" + String(value.language || "") + ":" + String(value.target || "")
  return mode + ":" + String(value.target || "")
}

function normalizeRun(run) {
  var value = run || {}
  var normalized = {
    timestamp: String(value.timestamp || ""),
    date: String(value.date || ""),
    mode: normalizedMode(value.mode),
    duration: Math.max(0, Number(value.duration) || 0),
    target: String(value.target || ""),
    challengeKey: String(value.challengeKey || ""),
    completed: value.completed !== false,
    contentVersion: String(value.contentVersion || ""),
    language: String(value.language || ""),
    sprintStyle: String(value.sprintStyle || "") === "words" ? "words"
      : (String(value.sprintStyle || "") === "prose" ? "prose" : ""),
    drillKeys: Array.isArray(value.drillKeys) ? value.drillKeys.map(String).slice(0, 2) : [],
    drillBigrams: Array.isArray(value.drillBigrams) ? value.drillBigrams.map(String).slice(0, 2) : [],
    targetErrors: Math.max(0, Math.floor(Number(value.targetErrors) || 0)),
    characters: Math.max(0, Math.floor(Number(value.characters) || 0)),
    wpm: Math.max(0, Number(value.wpm) || 0),
    rawWpm: Math.max(0, Number(value.rawWpm) || 0),
    accuracy: clamp(Number(value.accuracy) || 0, 0, 100),
    consistency: clamp(Number(value.consistency) || 0, 0, 100),
    errors: Math.max(0, Math.floor(Number(value.errors) || 0)),
    dailyId: String(value.dailyId || ""),
    previousBestWpm: Math.max(0, Number(value.previousBestWpm) || 0),
    personalBest: value.personalBest === true,
    keyMistakes: normalizeCounts(value.keyMistakes),
    bigramMistakes: normalizeCounts(value.bigramMistakes),
    pace: Array.isArray(value.pace) ? value.pace.map(function(sample) {
      return Math.max(0, Number(sample) || 0)
    }).slice(0, 180) : [],
    publicSlug: /^[A-HJ-NP-Z2-9]{8}$/.test(String(value.publicSlug || "")) ? String(value.publicSlug) : "",
    publicPinned: value.publicPinned === true
  }
  if (!normalized.challengeKey) normalized.challengeKey = fallbackChallengeKey(normalized)
  return normalized
}

function stateNeedsQuarantine(raw) {
  var text = String(raw || "")
  if (!text.trim()) return false
  var parsed = null
  try { parsed = JSON.parse(text) } catch (error) { return true }
  if (!parsed || typeof parsed !== "object") return true
  return [1, 2, 3, 4, 5, 6].indexOf(Number(parsed.version)) < 0
}

function parseState(raw) {
  var parsed
  try { parsed = JSON.parse(String(raw || "")) } catch (error) { return emptyState() }
  if (!parsed || [1, 2, 3, 4, 5, 6].indexOf(Number(parsed.version)) < 0) return emptyState()
  var state = emptyState()
  state.runs = Array.isArray(parsed.runs) ? parsed.runs.map(normalizeRun).slice(0, 500) : []
  state.bestWpm = Math.max(0, Number(parsed.bestWpm) || 0)
  for (var i = 0; i < state.runs.length; i++) state.bestWpm = Math.max(state.bestWpm, state.runs[i].wpm)
  state.totalTests = Math.max(state.runs.length, Math.floor(Number(parsed.totalTests) || 0))
  state.streak = Math.max(0, Math.floor(Number(parsed.streak) || 0))
  state.lastPlayedDate = String(parsed.lastPlayedDate || "")
  state.keyMistakes = normalizeCounts(parsed.keyMistakes)
  state.bigramMistakes = normalizeCounts(parsed.bigramMistakes)
  if (parsed.settings && typeof parsed.settings === "object") {
    state.settings.defaultMode = parsed.settings.defaultMode === "words" ? "sprint"
      : (parsed.settings.defaultMode === "focus" ? "drill" : normalizedMode(parsed.settings.defaultMode))
    if ([15, 30, 60].indexOf(Number(parsed.settings.duration)) >= 0)
      state.settings.duration = Number(parsed.settings.duration)
    state.settings.sprintStyle = String(parsed.settings.sprintStyle || "prose") === "words" ? "words" : "prose"
    if (["bash", "python", "javascript", "rust"].indexOf(String(parsed.settings.codeLanguage)) >= 0)
      state.settings.codeLanguage = String(parsed.settings.codeLanguage)
    state.settings.showLiveStats = parsed.settings.showLiveStats !== false
    state.settings.ghostEnabled = parsed.settings.ghostEnabled !== false
    if ([0.9, 1, 1.1].indexOf(Number(parsed.settings.fontScale)) >= 0)
      state.settings.fontScale = Number(parsed.settings.fontScale)
  }
  return state
}

function daysBetween(previousKey, nextKey) {
  var previous = Date.parse(previousKey + "T00:00:00Z")
  var next = Date.parse(nextKey + "T00:00:00Z")
  if (!isFinite(previous) || !isFinite(next)) return 0
  return Math.round((next - previous) / 86400000)
}

function recordRun(state, run) {
  var next = parseState(JSON.stringify(state || emptyState()))
  var normalized = normalizeRun(run)
  next.runs.unshift(normalized)
  next.runs = next.runs.slice(0, 500)
  next.totalTests += 1
  next.bestWpm = Math.max(next.bestWpm, normalized.wpm)

  for (var key in normalized.keyMistakes)
    next.keyMistakes[key] = (Number(next.keyMistakes[key]) || 0) + normalized.keyMistakes[key]
  for (var pair in normalized.bigramMistakes)
    next.bigramMistakes[pair] = (Number(next.bigramMistakes[pair]) || 0) + normalized.bigramMistakes[pair]
  next.keyMistakes = capCounts(next.keyMistakes, 128)
  next.bigramMistakes = capCounts(next.bigramMistakes, 128)

  var validDate = /^\d{4}-\d{2}-\d{2}$/.test(normalized.date)
  if (validDate) {
    var gap = daysBetween(next.lastPlayedDate, normalized.date)
    if (next.lastPlayedDate === normalized.date) {
      // A personal calendar day counts once, no matter how many tests are played.
    } else if (gap === 1) {
      next.streak += 1
    } else {
      next.streak = 1
    }
    next.lastPlayedDate = normalized.date
  }
  return next
}

function mistakeLabel(character) {
  if (character === " ") return "space"
  if (character === "\n") return "enter"
  if (character === "\t") return "tab"
  return String(character || "?")
}

function addMistake(keyCounts, bigramCounts, expected, previousExpected) {
  var keys = normalizeCounts(keyCounts)
  var bigrams = normalizeCounts(bigramCounts)
  var key = mistakeLabel(expected)
  keys[key] = (keys[key] || 0) + 1
  if (previousExpected) {
    var pair = mistakeLabel(previousExpected) + "→" + mistakeLabel(expected)
    bigrams[pair] = (bigrams[pair] || 0) + 1
  }
  return { keys: keys, bigrams: bigrams }
}

function sortedCounts(counts, limit) {
  var rows = []
  var source = normalizeCounts(counts)
  for (var key in source) rows.push({ key: key, count: source[key] })
  rows.sort(function(a, b) { return b.count - a.count || a.key.localeCompare(b.key) })
  return rows.slice(0, Math.max(0, Number(limit) || rows.length))
}

function weakKeys(state, limit) {
  var rows = sortedCounts(state ? state.keyMistakes : {}, 100)
  var out = []
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key.length === 1 && /[a-z]/i.test(rows[i].key)) out.push(rows[i].key)
    if (out.length >= (Number(limit) || 4)) break
  }
  return out
}

function drillProfile(state, limit) {
  var runLimit = Math.max(3, Number(limit) || 12)
  var runs = state && state.runs ? state.runs : []
  var keyScores = {}
  var pairScores = {}
  var used = 0
  for (var i = 0; i < runs.length && used < runLimit; i++) {
    var run = normalizeRun(runs[i])
    if (run.mode === "focus") continue
    var weight = runLimit - used
    for (var key in run.keyMistakes)
      keyScores[key] = (keyScores[key] || 0) + run.keyMistakes[key] * weight
    for (var pair in run.bigramMistakes)
      pairScores[pair] = (pairScores[pair] || 0) + run.bigramMistakes[pair] * weight
    used++
  }

  var keys = sortedCounts(keyScores, 100).filter(function(row) {
    return row.key.length === 1 && /[a-z]/i.test(row.key)
  }).slice(0, 2).map(function(row) { return row.key.toLowerCase() })
  var bigrams = sortedCounts(pairScores, 100).filter(function(row) {
    var parts = row.key.split("→")
    return parts.length === 2 && /^[a-z]$/i.test(parts[0]) && /^[a-z]$/i.test(parts[1])
  }).slice(0, 2).map(function(row) { return row.key.toLowerCase() })

  if (keys.length === 0) keys = ["r", "t"]
  if (bigrams.length === 0) bigrams = ["t→h", "e→r"]
  return { keys: keys, bigrams: bigrams, sampleRuns: used, calibrating: used < 3 }
}

function drillTargetErrors(challenge, keyMistakes, bigramMistakes) {
  var descriptor = challenge || {}
  var keys = Array.isArray(descriptor.drillKeys) ? descriptor.drillKeys : []
  var bigrams = Array.isArray(descriptor.drillBigrams) ? descriptor.drillBigrams : []
  var keyCounts = normalizeCounts(keyMistakes)
  var pairCounts = normalizeCounts(bigramMistakes)
  var total = 0
  for (var i = 0; i < keys.length; i++) total += Number(keyCounts[keys[i]]) || 0
  for (var j = 0; j < bigrams.length; j++) total += Number(pairCounts[bigrams[j]]) || 0
  return total
}

function modeBest(state, mode) {
  var best = 0
  var wanted = normalizedMode(mode)
  var runs = state && state.runs ? state.runs : []
  for (var i = 0; i < runs.length; i++)
    if (runs[i].mode === wanted) best = Math.max(best, Number(runs[i].wpm) || 0)
  return best
}

function recentAverage(state, field, count, mode) {
  var runs = filteredRuns(state, mode || "all", Math.max(1, Number(count) || 10))
  if (runs.length === 0) return 0
  var total = 0
  for (var i = 0; i < runs.length; i++) total += Number(runs[i][field]) || 0
  return round(total / runs.length, 1)
}

function latestRun(state) {
  return state && state.runs && state.runs.length > 0 ? normalizeRun(state.runs[0]) : null
}

function updateRunPublication(state, timestamp, slug, pinned, challengeKey) {
  var next = parseState(JSON.stringify(state || emptyState()))
  var wanted = String(timestamp || "")
  var wantedKey = String(challengeKey || "")
  var target = -1
  for (var index = 0; index < next.runs.length; index++) {
    if (next.runs[index].timestamp !== wanted) continue
    if (wantedKey && next.runs[index].challengeKey !== wantedKey) continue
    target = index
    break
  }
  if (target < 0) return next
  if (slug !== undefined) next.runs[target].publicSlug = String(slug || "")
  if (pinned !== undefined) next.runs[target].publicPinned = pinned === true
  return next
}

function clearRunPublications(state) {
  var next = parseState(JSON.stringify(state || emptyState()))
  for (var index = 0; index < next.runs.length; index++) {
    next.runs[index].publicSlug = ""
    next.runs[index].publicPinned = false
  }
  return next
}

function bestForDate(state, key) {
  var best = 0
  var runs = state && state.runs ? state.runs : []
  for (var i = 0; i < runs.length; i++) {
    if (runs[i].date === key) best = Math.max(best, Number(runs[i].wpm) || 0)
  }
  return best
}

function dailyRun(state, dailyId) {
  var best = null
  var runs = state && state.runs ? state.runs : []
  for (var i = 0; i < runs.length; i++) {
    if (runs[i].mode !== "daily" || String(runs[i].dailyId) !== String(dailyId)) continue
    if (!best || runs[i].wpm > best.wpm) best = normalizeRun(runs[i])
  }
  return best
}

function filteredRuns(state, mode, limit) {
  var wanted = String(mode || "all")
  var source = state && state.runs ? state.runs : []
  var rows = []
  for (var i = 0; i < source.length; i++) {
    var run = normalizeRun(source[i])
    if (wanted === "all" || run.mode === wanted
        || (wanted === "words" && run.mode === "sprint" && run.sprintStyle === "words")) rows.push(run)
    if (rows.length >= (Number(limit) || source.length)) break
  }
  return rows
}

function recentTrend(state, mode, count) {
  var rows = filteredRuns(state, mode || "all", Math.max(1, Number(count) || 20))
  rows.reverse()
  return rows
}

function bestComparableRun(state, descriptor) {
  var wanted = String((descriptor || {}).challengeKey || fallbackChallengeKey(descriptor || {}))
  var best = null
  var runs = state && state.runs ? state.runs : []
  for (var i = 0; i < runs.length; i++) {
    var run = normalizeRun(runs[i])
    if (run.challengeKey !== wanted) continue
    if (!best || run.wpm > best.wpm) best = run
  }
  return best
}

function paceAt(run, elapsedMs) {
  if (!run || !run.pace || run.pace.length === 0) return 0
  var index = clamp(Math.floor(Number(elapsedMs) / 1000) - 1, 0, run.pace.length - 1)
  return Number(run.pace[index]) || 0
}

function eraseWordIndex(text) {
  var value = String(text || "")
  var index = value.length
  while (index > 0 && /\s/.test(value.charAt(index - 1))) index--
  while (index > 0 && !/\s/.test(value.charAt(index - 1))) index--
  return index
}

function resultAction(text, controlPressed, ageMs, autoRepeat) {
  if (autoRepeat || Number(ageMs) < 900 || !controlPressed) return ""
  var value = String(text || "").toLowerCase()
  if (value === "r") return "retry"
  if (value === "s") return "share"
  if (value === "c") return "copy"
  if (value === "h") return "history"
  return ""
}

function paceSparkline(samples) {
  var source = Array.isArray(samples) ? samples.map(function(value) {
    return Math.max(0, Number(value) || 0)
  }) : []
  if (source.length < 2) return ""
  var bars = "▁▂▃▄▅▆▇█"
  var minimum = Math.min.apply(Math, source)
  var maximum = Math.max.apply(Math, source)
  var range = Math.max(1, maximum - minimum)
  return source.map(function(value) {
    return bars.charAt(Math.min(bars.length - 1,
      Math.floor((value - minimum) / range * (bars.length - 1))))
  }).join("")
}

function shareText(run) {
  if (!run) return "TYPEARCHY"
  var mode = normalizedMode(run.mode)
  var label = mode === "quote" ? "QUOTE RELAY" : mode.toUpperCase()
  if (mode === "daily") label += " #" + String(run.dailyId || "")
  else if (mode === "sprint") label += " " + (run.sprintStyle ? run.sprintStyle.toUpperCase() + " " : "") + run.duration + "S"
  else if (run.target) label += " " + String(run.target).toUpperCase()
  var achievement = run.personalBest ? "\nNEW PERSONAL BEST" : ""
  var pace = paceSparkline(run.pace)
  return "TYPEARCHY / " + label + "\n" + Math.round(run.wpm) + " WPM  |  "
    + round(run.accuracy, 1) + "% ACCURACY" + achievement
    + (pace ? "\nPACE  " + pace : "")
    + "\nBEAT THIS RUN  " + (run.publicSlug ? "TYPEARCHY.COM/R/" + run.publicSlug : "TYPEARCHY.COM")
}

function colorString(color) {
  return String(color || "#ffffff")
}

function escapeHtml(character) {
  if (character === "&") return "&amp;"
  if (character === "<") return "&lt;"
  if (character === ">") return "&gt;"
  if (character === "\"") return "&quot;"
  return character
}

function renderedPrompt(prompt, typed, colors) {
  var source = String(prompt || "")
  var entered = String(typed || "")
  var palette = colors || {}
  var normal = colorString(palette.normal || "#ffffff")
  var dim = colorString(palette.dim || "#777777")
  var error = colorString(palette.error || "#ff5555")
  var cursor = colorString(palette.cursor || "#ffffff")
  var background = colorString(palette.background || "#000000")
  var out = []

  for (var i = 0; i < source.length; i++) {
    var expected = source.charAt(i)
    var shown = escapeHtml(expected)
    if (expected === "\n") shown = "↵<br/>"
    else if (expected === "\t") shown = "&nbsp;&nbsp;&nbsp;&nbsp;"
    if (i < entered.length && entered.charAt(i) !== expected && expected === " ") shown = "_"
    var style
    if (i < entered.length) style = entered.charAt(i) === expected || entered.charAt(i) === ASSISTED_CHARACTER
      ? "color:" + normal
      : "color:" + error + ";text-decoration:underline"
    else if (i === entered.length) style = "color:" + background + ";background-color:" + cursor
    else style = "color:" + dim
    out.push("<span style=\"" + style + "\">" + shown + "</span>")
  }
  return out.join("")
}
