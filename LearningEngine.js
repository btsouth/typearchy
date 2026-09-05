.pragma library

// Aggregate practice evidence only. No passages or input recordings are retained.
function learningState() { return { version: 1, keys: {}, pairs: {} } }
function learningLabel(character) {
  if (character === " ") return "space"
  if (character === "\n") return "enter"
  if (character === "\t") return "tab"
  return String(character || "").toLowerCase()
}
function learningToken(value) {
  return typeof value === "string" && (/^[^\s\x00-\x1f\x7f]$/.test(value) || ["space", "enter", "tab"].indexOf(value) >= 0)
}
function learningNormalize(value) {
  var out = learningState()
  if (!value || value.version !== 1) return out
  function copy(source, target, pair) {
    if (!source || typeof source !== "object") return
    var names = Object.keys(source).slice(0, 128)
    for (var i = 0; i < names.length; i++) {
      var name = names[i], pieces = pair ? name.split("→") : [name], row = source[name]
      if (pieces.length !== (pair ? 2 : 1) || !pieces.every(learningToken) || !row) continue
      var attempts = Number(row.attempts), errors = Number(row.errors)
      if (!isFinite(attempts) || !isFinite(errors) || attempts < 1 || attempts > 100000 || errors < 0 || errors > attempts) continue
      target[name] = { attempts: Math.floor(attempts), errors: Math.floor(errors) }
    }
  }
  copy(value.keys, out.keys, false); copy(value.pairs, out.pairs, true)
  return out
}
function learningRecord(state, expected, previousExpected, correct) {
  var key = learningLabel(expected), previous = learningLabel(previousExpected)
  function count(target, label) {
    if (!target[label] && Object.keys(target).length >= 128) return
    var row = target[label] || { attempts: 0, errors: 0 }
    row.attempts += 1; row.errors += correct ? 0 : 1
    target[label] = row
  }
  if (learningToken(key)) count(state.keys, key)
  if (learningToken(key) && learningToken(previous)) count(state.pairs, previous + "→" + key)
}
function learningProfile(runs) {
  var combined = learningState(), sampledRuns = 0, totalAttempts = 0
  var recent = Array.isArray(runs) ? runs.slice(0, 12) : []
  for (var i = 0; i < recent.length; i++) {
    var evidence = learningNormalize(recent[i].learning)
    if (!Object.keys(evidence.keys).length) continue
    sampledRuns++
    for (var category in { keys: 1, pairs: 1 }) {
      for (var token in evidence[category]) {
        var row = evidence[category][token]
        if (!combined[category][token]) combined[category][token] = { attempts: 0, errors: 0 }
        combined[category][token].attempts += row.attempts
        combined[category][token].errors += row.errors
        if (category === "keys") totalAttempts += row.attempts
      }
    }
  }
  function rank(source) {
    return Object.keys(source).map(function(key) {
      var row = source[key]
      return { key: key, attempts: row.attempts, errors: row.errors,
        accuracy: Math.round((1 - row.errors / row.attempts) * 100),
        // Avoid promoting a single unusual mistake over repeated observations.
        priority: row.errors / (row.attempts + 8) }
    }).filter(function(row) { return row.attempts >= 5 && row.errors >= 2 && row.errors / row.attempts >= 0.03 })
      .sort(function(a, b) { return b.priority - a.priority || b.attempts - a.attempts || a.key.localeCompare(b.key) }).slice(0, 6)
  }
  return { keys: rank(combined.keys), pairs: rank(combined.pairs), sampledRuns: sampledRuns,
    totalAttempts: totalAttempts, calibrating: totalAttempts < 100 }
}
