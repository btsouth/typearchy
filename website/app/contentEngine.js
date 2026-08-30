// Generated from the Typearchy desktop content engine. Keep both copies byte-aligned through tests.
var VERSION = "2026.08.2"
var NOUNS = ["runs", "samples", "events", "records", "frames", "metrics", "jobs", "packets", "signals", "tasks", "entries", "snapshots"]
var LABELS = ["alpha", "beta", "stable", "canary", "local", "remote", "active", "queued", "passed", "failed", "cached", "fresh"]
var EXTENSIONS = ["qml", "js", "ts", "py", "rs", "md", "json", "toml"]
var UNITS = ["omarchy-shell", "typearchy", "pipewire", "wireplumber", "xdg-desktop-portal-hyprland"]
var GLOBS = ["*.qml", "*.js", "*.ts", "*.py", "*.rs", "*.md"]

var SHELL_WORKFLOWS = [
  ["git status --short", "git switch -c feature/{{label}}", "rg --files -g '{{glob}}' | sort", "git diff --stat", "git log --oneline -{{limit}}"],
  ["systemctl --user status {{unit}}", "journalctl --user -u {{unit}} -n {{count}} --no-pager", "ps -eo pid,comm,%cpu,%mem --sort=-%cpu", "free -h", "df -h /"],
  ["find . -maxdepth {{depth}} -type f -name '{{glob}}'", "rg -n \"TODO|FIXME\" -g '{{glob}}' .", "du -sh ./* | sort -h", "stat README.md", "sha256sum manifest.json"],
  ["mkdir -p work/{{label}}", "cp README.md work/{{label}}/notes.md", "tar -czf work/{{label}}.tar.gz work/{{label}}", "file work/{{label}}.tar.gz", "printf '%s\\n' {{label}}-complete"],
  ["git fetch --prune", "git branch --sort=-committerdate", "git show --stat --oneline HEAD", "git diff --check", "git status --short --branch"],
  ["pacman -Q | sort", "pacman -Qo /usr/bin/bash", "pacman -Ql bash | head -{{limit}}", "pacman -Qdtq", "checkupdates"],
  ["ip -brief address", "ip route show default", "ss -tulpn", "resolvectl status", "ping -c {{depth}} example.com"],
  ["jq -r '.name' manifest.json", "sed -n '1,{{count}}p' README.md", "awk 'NF { count++ } END { print count }' README.md", "sort -u words.txt > words.sorted.txt", "comm -3 expected.txt actual.txt"],
  ["tar -tf archive.tar.gz | head -{{limit}}", "unzip -l release.zip", "curl -I https://example.com", "openssl dgst -sha256 release.tar.gz", "date -u +'%Y-%m-%dT%H:%M:%SZ'"],
  ["systemd-analyze blame | head -{{limit}}", "systemd-analyze critical-chain", "loginctl session-status", "journalctl -b -p warning --no-pager", "uptime"]
]

function hashSeed(text) {
  var hash = 2166136261
  var value = String(text || "")
  for (var index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function canonicalSeed(namespace, seed) {
  var prefix = "generated:" + namespace + ":"
  var value = String(seed || "")
  return value.indexOf(prefix) === 0 ? value.slice(prefix.length) : hashSeed(namespace + ":" + value).toString(36)
}

function seededRandom(seed) {
  var state = seed >>> 0
  return function() {
    state += 0x6D2B79F5
    var value = state
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

function pick(values, random) {
  return values[Math.floor(random() * values.length)]
}

function shuffled(values, random) {
  var result = values.slice()
  for (var index = result.length - 1; index > 0; index--) {
    var swap = Math.floor(random() * (index + 1))
    var current = result[index]
    result[index] = result[swap]
    result[swap] = current
  }
  return result
}

function replaceTokens(line, tokens) {
  return String(line).replace(/\{\{([a-z]+)\}\}/g, function(_, key) { return String(tokens[key] || "") })
}

function context(seed) {
  var hashed = hashSeed(seed)
  var random = seededRandom(hashed)
  var first = pick(NOUNS, random)
  var second = pick(NOUNS.filter(function(value) { return value !== first }), random)
  return {
    random: random,
    tag: hashed.toString(36).slice(0, 5),
    first: first,
    second: second,
    label: pick(LABELS, random),
    extension: pick(EXTENSIONS, random),
    window: 2 + Math.floor(random() * 4),
    attempts: 2 + Math.floor(random() * 4),
    variant: hashed & 15,
    values: shuffled([42, 58, 64, 71, 76, 83, 89, 94, 101, 108], random).slice(0, 7)
  }
}

function variantEnabled(ctx, bit) {
  return (ctx.variant & bit) !== 0
}

function familyName(ctx) {
  return [
    variantEnabled(ctx, 1) ? "median" : "rolling",
    variantEnabled(ctx, 2) ? "distinct" : "grouped",
    variantEnabled(ctx, 4) ? "extension-counts" : "manifest",
    variantEnabled(ctx, 8) ? "batches" : "retries"
  ].join("-")
}

function javascriptProgram(ctx) {
  var averageMode = variantEnabled(ctx, 1)
  var countMode = variantEnabled(ctx, 2)
  var extensionMode = variantEnabled(ctx, 4)
  var batchMode = variantEnabled(ctx, 8)
  var average = (averageMode ? "median_" : "movingAverage_") + ctx.first + "_" + ctx.tag
  var group = (countMode ? "countBy_" : "groupBy_") + ctx.second + "_" + ctx.tag
  var manifest = (extensionMode ? "countExtensions_" : "buildManifest_") + ctx.extension + "_" + ctx.tag
  var retry = (batchMode ? "batchJobs_" : "retryQueue_") + ctx.label + "_" + ctx.tag
  var values = "values_" + ctx.first + "_" + ctx.tag
  var blocks = [
    averageMode
      ? ["function " + average + "(values) {", "  if (!values.length) return null", "  const sorted = [...values].sort((left, right) => left - right)", "  const middle = Math.floor(sorted.length / 2)", "  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2", "}"].join("\n")
      : ["function " + average + "(values, window) {", "  if (!Number.isInteger(window) || window < 1) throw new RangeError('invalid window')", "  return values.slice(window - 1).map((_, index) => {", "    const sample = values.slice(index, index + window)", "    return sample.reduce((sum, value) => sum + value, 0) / window", "  })", "}"].join("\n"),
    countMode
      ? ["function " + group + "(items, keyFor) {", "  const counts = new Map()", "  for (const item of items) {", "    const key = keyFor(item)", "    counts.set(key, (counts.get(key) ?? 0) + 1)", "  }", "  return counts", "}"].join("\n")
      : ["function " + group + "(items, keyFor) {", "  const groups = new Map()", "  for (const item of items) {", "    const key = keyFor(item)", "    const bucket = groups.get(key) ?? []", "    bucket.push(item)", "    groups.set(key, bucket)", "  }", "  return groups", "}"].join("\n"),
    extensionMode
      ? ["function " + manifest + "(paths) {", "  const counts = new Map()", "  for (const path of paths) {", "    const extension = path.includes('.') ? path.split('.').pop() : 'none'", "    counts.set(extension, (counts.get(extension) ?? 0) + 1)", "  }", "  return counts", "}"].join("\n")
      : ["function " + manifest + "(paths, extension) {", "  return paths", "    .filter(path => path.endsWith('.' + extension))", "    .map((path, index) => ({ path, order: index + 1 }))", "    .sort((left, right) => left.path.localeCompare(right.path))", "}"].join("\n"),
    batchMode
      ? ["function " + retry + "(jobs, size) {", "  if (size < 1) throw new RangeError('invalid batch size')", "  const batches = []", "  for (let index = 0; index < jobs.length; index += size) {", "    batches.push(jobs.slice(index, index + size))", "  }", "  return batches", "}"].join("\n")
      : ["function " + retry + "(jobs, attempts) {", "  const queue = jobs.map(job => ({ job, attempt: 1 }))", "  const scheduled = []", "  while (queue.length) {", "    const current = queue.shift()", "    scheduled.push(current.job + ':' + current.attempt)", "    if (current.attempt < attempts) queue.push({ ...current, attempt: current.attempt + 1 })", "  }", "  return scheduled", "}"].join("\n")
  ]
  return shuffled(blocks, ctx.random).join("\n\n") + "\n\n" + [
    "const " + values + " = [" + ctx.values.join(", ") + "]",
    "const statistics = " + average + "(" + values + (averageMode ? "" : ", " + ctx.window) + ")",
    "const records = [{ name: '" + ctx.label + "-one', state: 'ready' }, { name: '" + ctx.label + "-two', state: 'queued' }, { name: '" + ctx.label + "-three', state: 'ready' }]",
    "const grouped = " + group + "(records, record => record.state)",
    "const files = " + manifest + "(['app/main." + ctx.extension + "', 'README.md', 'tests/model." + ctx.extension + "']" + (extensionMode ? "" : ", '" + ctx.extension + "'") + ")",
    "const schedule = " + retry + "(['index', 'verify', 'publish'], " + (batchMode ? ctx.window : ctx.attempts) + ")",
    "console.log({ statistics, groups: [...grouped.entries()], files: [...files], schedule })"
  ].join("\n")
}

function pythonProgram(ctx) {
  var averageMode = variantEnabled(ctx, 1)
  var countMode = variantEnabled(ctx, 2)
  var extensionMode = variantEnabled(ctx, 4)
  var batchMode = variantEnabled(ctx, 8)
  var average = (averageMode ? "median_" : "moving_average_") + ctx.first + "_" + ctx.tag
  var group = (countMode ? "count_by_" : "group_by_") + ctx.second + "_" + ctx.tag
  var manifest = (extensionMode ? "count_extensions_" : "build_manifest_") + ctx.extension + "_" + ctx.tag
  var retry = (batchMode ? "batch_jobs_" : "retry_queue_") + ctx.label + "_" + ctx.tag
  var values = "values_" + ctx.first + "_" + ctx.tag
  var blocks = [
    averageMode
      ? ["def " + average + "(values):", "    if not values:", "        return None", "    ordered = sorted(values)", "    middle = len(ordered) // 2", "    return ordered[middle] if len(ordered) % 2 else (ordered[middle - 1] + ordered[middle]) / 2"].join("\n")
      : ["def " + average + "(values, window):", "    if window < 1:", "        raise ValueError(\"window must be positive\")", "    return [sum(values[index:index + window]) / window", "            for index in range(len(values) - window + 1)]"].join("\n"),
    countMode
      ? ["def " + group + "(items, key_for):", "    counts = {}", "    for item in items:", "        key = key_for(item)", "        counts[key] = counts.get(key, 0) + 1", "    return counts"].join("\n")
      : ["def " + group + "(items, key_for):", "    groups = {}", "    for item in items:", "        key = key_for(item)", "        groups.setdefault(key, []).append(item)", "    return groups"].join("\n"),
    extensionMode
      ? ["def " + manifest + "(paths):", "    counts = {}", "    for path in paths:", "        extension = path.suffix.lstrip('.') or 'none'", "        counts[extension] = counts.get(extension, 0) + 1", "    return counts"].join("\n")
      : ["def " + manifest + "(paths, extension):", "    matches = (path for path in paths if path.suffix == f\".{extension}\")", "    return [{\"path\": str(path), \"order\": index}", "            for index, path in enumerate(sorted(matches), start=1)]"].join("\n"),
    batchMode
      ? ["def " + retry + "(jobs, size):", "    if size < 1:", "        raise ValueError(\"size must be positive\")", "    return [jobs[index:index + size]", "            for index in range(0, len(jobs), size)]"].join("\n")
      : ["def " + retry + "(jobs, attempts):", "    queue = [(job, 1) for job in jobs]", "    scheduled = []", "    while queue:", "        job, attempt = queue.pop(0)", "        scheduled.append(f\"{job}:{attempt}\")", "        if attempt < attempts:", "            queue.append((job, attempt + 1))", "    return scheduled"].join("\n")
  ]
  return "from pathlib import Path\n\n" + shuffled(blocks, ctx.random).join("\n\n") + "\n\n" + [
    "if __name__ == \"__main__\":",
    "    " + values + " = [" + ctx.values.join(", ") + "]",
    "    statistics = " + average + "(" + values + (averageMode ? "" : ", " + ctx.window) + ")",
    "    records = [{\"name\": \"" + ctx.label + "-one\", \"state\": \"ready\"}, {\"name\": \"" + ctx.label + "-two\", \"state\": \"queued\"}]",
    "    grouped = " + group + "(records, lambda record: record[\"state\"])",
    "    files = " + manifest + "([Path(\"app/main." + ctx.extension + "\"), Path(\"README.md\")]" + (extensionMode ? "" : ", \"" + ctx.extension + "\"") + ")",
    "    schedule = " + retry + "([\"index\", \"verify\", \"publish\"], " + (batchMode ? ctx.window : ctx.attempts) + ")",
    "    print({\"statistics\": statistics, \"groups\": grouped, \"files\": files, \"schedule\": schedule})"
  ].join("\n")
}

function bashProgram(ctx) {
  var averageMode = variantEnabled(ctx, 1)
  var uniqueMode = variantEnabled(ctx, 2)
  var extensionMode = variantEnabled(ctx, 4)
  var batchMode = variantEnabled(ctx, 8)
  var average = (averageMode ? "median_" : "moving_average_") + ctx.first + "_" + ctx.tag
  var groups = (uniqueMode ? "unique_states_" : "count_states_") + ctx.second + "_" + ctx.tag
  var manifest = (extensionMode ? "count_extensions_" : "build_manifest_") + ctx.extension + "_" + ctx.tag
  var retry = (batchMode ? "batch_jobs_" : "retry_queue_") + ctx.label + "_" + ctx.tag
  var values = "values_" + ctx.first + "_" + ctx.tag
  var blocks = [
    averageMode
      ? [average + "() {", "  mapfile -t ordered < <(printf '%s\\n' \"$@\" | sort -n)", "  local count=${#ordered[@]}", "  ((count > 0)) || return 0", "  local middle=$((count / 2))", "  if ((count % 2)); then", "    printf '%s\\n' \"${ordered[middle]}\"", "  else", "    printf '%d\\n' \"$(( (ordered[middle - 1] + ordered[middle]) / 2 ))\"", "  fi", "}"].join("\n")
      : [average + "() {", "  local window=$1; shift", "  local -a values=(\"$@\")", "  local index offset total", "  for ((index = 0; index + window <= ${#values[@]}; index++)); do", "    total=0", "    for ((offset = 0; offset < window; offset++)); do", "      ((total += values[index + offset]))", "    done", "    printf '%d\\n' \"$((total / window))\"", "  done", "}"].join("\n"),
    uniqueMode
      ? [groups + "() {", "  declare -A seen=()", "  local state", "  for state in \"$@\"; do", "    [[ ${seen[\"$state\"]:-} ]] && continue", "    seen[\"$state\"]=1", "    printf '%s\\n' \"$state\"", "  done", "}"].join("\n")
      : [groups + "() {", "  declare -A counts=()", "  local state", "  for state in \"$@\"; do", "    counts[\"$state\"]=$(( ${counts[\"$state\"]:-0} + 1 ))", "  done", "  for state in \"${!counts[@]}\"; do", "    printf '%s:%d\\n' \"$state\" \"${counts[$state]}\"", "  done", "}"].join("\n"),
    extensionMode
      ? [manifest + "() {", "  declare -A counts=()", "  local path extension", "  for path in \"$@\"; do", "    extension=${path##*.}", "    [[ $path == *.* ]] || extension=none", "    counts[\"$extension\"]=$(( ${counts[\"$extension\"]:-0} + 1 ))", "  done", "  for extension in \"${!counts[@]}\"; do", "    printf '%s:%d\\n' \"$extension\" \"${counts[$extension]}\"", "  done", "}"].join("\n")
      : [manifest + "() {", "  local extension=$1; shift", "  local path order=0", "  for path in \"$@\"; do", "    [[ $path == *.\"$extension\" ]] || continue", "    ((order += 1))", "    printf '%02d %s\\n' \"$order\" \"$path\"", "  done", "}"].join("\n"),
    batchMode
      ? [retry + "() {", "  local size=$1; shift", "  local index=0 job", "  for job in \"$@\"; do", "    printf '%d:%s\\n' \"$((index / size + 1))\" \"$job\"", "    ((index += 1))", "  done", "}"].join("\n")
      : [retry + "() {", "  local attempts=$1; shift", "  local job attempt", "  for job in \"$@\"; do", "    for ((attempt = 1; attempt <= attempts; attempt++)); do", "      printf '%s:%d\\n' \"$job\" \"$attempt\"", "    done", "  done", "}"].join("\n")
  ]
  return "#!/usr/bin/env bash\nset -euo pipefail\n\n" + shuffled(blocks, ctx.random).join("\n\n") + "\n\n" + [
    values + "=(" + ctx.values.join(" ") + ")",
    "mapfile -t statistics < <(" + average + " " + (averageMode ? "\"${" + values + "[@]}\"" : ctx.window + " \"${" + values + "[@]}\"") + ")",
    "mapfile -t states < <(" + groups + " ready queued ready failed)",
    "mapfile -t files < <(" + manifest + " " + (extensionMode ? "" : ctx.extension + " ") + "app/main." + ctx.extension + " README.md tests/model." + ctx.extension + ")",
    "mapfile -t schedule < <(" + retry + " " + (batchMode ? ctx.window : ctx.attempts) + " index verify publish)",
    "printf 'statistics=%s states=%s files=%s schedule=%s\\n' \"${#statistics[@]}\" \"${#states[@]}\" \"${#files[@]}\" \"${#schedule[@]}\""
  ].join("\n")
}

function rustProgram(ctx) {
  var averageMode = variantEnabled(ctx, 1)
  var uniqueMode = variantEnabled(ctx, 2)
  var extensionMode = variantEnabled(ctx, 4)
  var batchMode = variantEnabled(ctx, 8)
  var average = (averageMode ? "median_" : "moving_average_") + ctx.first + "_" + ctx.tag
  var group = (uniqueMode ? "unique_states_" : "count_states_") + ctx.second + "_" + ctx.tag
  var manifest = (extensionMode ? "count_extensions_" : "build_manifest_") + ctx.extension + "_" + ctx.tag
  var retry = (batchMode ? "batch_jobs_" : "retry_queue_") + ctx.label + "_" + ctx.tag
  var values = "values_" + ctx.first + "_" + ctx.tag
  var blocks = [
    averageMode
      ? ["fn " + average + "(values: &[f64]) -> Option<f64> {", "    if values.is_empty() { return None; }", "    let mut ordered = values.to_vec();", "    ordered.sort_by(|left, right| left.total_cmp(right));", "    let middle = ordered.len() / 2;", "    Some(if ordered.len() % 2 == 1 { ordered[middle] } else { (ordered[middle - 1] + ordered[middle]) / 2.0 })", "}"].join("\n")
      : ["fn " + average + "(values: &[f64], window: usize) -> Vec<f64> {", "    if window == 0 || window > values.len() { return Vec::new(); }", "    values.windows(window)", "        .map(|sample| sample.iter().sum::<f64>() / window as f64)", "        .collect()", "}"].join("\n"),
    uniqueMode
      ? ["fn " + group + "(states: &[&str]) -> Vec<String> {", "    let mut unique = Vec::new();", "    for state in states {", "        if !unique.iter().any(|value| value == state) {", "            unique.push((*state).to_string());", "        }", "    }", "    unique", "}"].join("\n")
      : ["fn " + group + "(states: &[&str]) -> HashMap<String, usize> {", "    let mut groups = HashMap::new();", "    for state in states {", "        *groups.entry((*state).to_string()).or_insert(0) += 1;", "    }", "    groups", "}"].join("\n"),
    extensionMode
      ? ["fn " + manifest + "(paths: &[&str]) -> HashMap<String, usize> {", "    let mut counts = HashMap::new();", "    for path in paths {", "        let extension = path.rsplit_once('.').map(|(_, value)| value).unwrap_or(\"none\");", "        *counts.entry(extension.to_string()).or_insert(0) += 1;", "    }", "    counts", "}"].join("\n")
      : ["fn " + manifest + "(paths: &[&str], extension: &str) -> Vec<String> {", "    let suffix = format!(\".{extension}\");", "    let mut matches: Vec<_> = paths.iter()", "        .filter(|path| path.ends_with(&suffix))", "        .map(|path| (*path).to_string())", "        .collect();", "    matches.sort();", "    matches", "}"].join("\n"),
    batchMode
      ? ["fn " + retry + "(jobs: &[&str], size: usize) -> Vec<Vec<String>> {", "    if size == 0 { return Vec::new(); }", "    jobs.chunks(size)", "        .map(|chunk| chunk.iter().map(|job| (*job).to_string()).collect())", "        .collect()", "}"].join("\n")
      : ["fn " + retry + "(jobs: &[&str], attempts: usize) -> Vec<String> {", "    let mut queue: VecDeque<_> = jobs.iter().map(|job| ((*job).to_string(), 1)).collect();", "    let mut scheduled = Vec::new();", "    while let Some((job, attempt)) = queue.pop_front() {", "        scheduled.push(format!(\"{job}:{attempt}\"));", "        if attempt < attempts { queue.push_back((job, attempt + 1)); }", "    }", "    scheduled", "}"].join("\n")
  ]
  return "use std::collections::{HashMap, VecDeque};\n\n" + shuffled(blocks, ctx.random).join("\n\n") + "\n\n" + [
    "fn main() {",
    "    let " + values + " = [" + ctx.values.map(function(value) { return value + ".0" }).join(", ") + "];",
    "    let statistics = " + average + "(&" + values + (averageMode ? "" : ", " + ctx.window) + ");",
    "    let groups = " + group + "(&[\"ready\", \"queued\", \"ready\", \"failed\"]);",
    "    let files = " + manifest + "(&[\"app/main." + ctx.extension + "\", \"README.md\", \"tests/model." + ctx.extension + "\"]" + (extensionMode ? "" : ", \"" + ctx.extension + "\"") + ");",
    "    let schedule = " + retry + "(&[\"index\", \"verify\", \"publish\"], " + (batchMode ? ctx.window : ctx.attempts) + ");",
    "    println!(\"{:?} {} {} {}\", statistics, groups.len(), files.len(), schedule.len());",
    "}"
  ].join("\n")
}

function generateCode(language, seed, minimumCharacters) {
  var namespace = "code:" + language
  var canonical = canonicalSeed(namespace, seed)
  var ctx = context(namespace + ":" + canonical)
  var renderers = { bash: bashProgram, python: pythonProgram, javascript: javascriptProgram, rust: rustProgram }
  var prompt = (renderers[language] || renderers.bash)(ctx)
  return { prompt: prompt, key: "generated:" + namespace + ":" + canonical, family: familyName(ctx), version: VERSION, sufficient: prompt.length >= Math.max(360, Number(minimumCharacters) || 0) }
}

function generateShell(seed, minimumCharacters) {
  var canonical = canonicalSeed("shell", seed)
  var random = seededRandom(hashSeed("shell:" + canonical))
  var tokens = { label: pick(LABELS, random), glob: pick(GLOBS, random), unit: pick(UNITS, random), limit: 5 + Math.floor(random() * 8), count: 40 + Math.floor(random() * 61), depth: 2 + Math.floor(random() * 3) }
  var order = shuffled(SHELL_WORKFLOWS, random)
  var selected = []
  for (var index = 0; index < order.length; index++) {
    selected.push(order[index].map(function(line) { return replaceTokens(line, tokens) }).join("\n"))
    if (selected.join("\n\n").length >= Math.max(360, Number(minimumCharacters) || 0)) break
  }
  return { prompt: selected.join("\n\n"), key: "generated:shell:" + canonical, family: "terminal-workflows", version: VERSION }
}

function generateWords(words, count, seed) {
  var canonical = canonicalSeed("words", seed)
  var random = seededRandom(hashSeed("words:" + canonical))
  var buckets = [[], [], []]
  words.forEach(function(word) {
    if (word.length <= 5) buckets[0].push(word)
    else if (word.length <= 7) buckets[1].push(word)
    else buckets[2].push(word)
  })
  buckets = buckets.map(function(bucket) { return shuffled(bucket, random) })
  var result = []
  var positions = [0, 0, 0]
  var cycle = shuffled([0, 1, 2], random)
  while (result.length < count) {
    var bucketIndex = cycle[result.length % cycle.length]
    if (positions[bucketIndex] >= buckets[bucketIndex].length) {
      bucketIndex = buckets.findIndex(function(bucket, index) { return positions[index] < bucket.length })
      if (bucketIndex < 0) break
    }
    result.push(buckets[bucketIndex][positions[bucketIndex]++])
  }
  return { prompt: result.join(" "), key: "generated:words:" + canonical, version: VERSION }
}

function generateProse(passages, seed, minimumCharacters) {
  var canonical = canonicalSeed("prose", seed)
  var ordered = shuffled(passages, seededRandom(hashSeed("prose:" + canonical)))
  var selected = []
  for (var index = 0; index < ordered.length; index++) {
    selected.push(ordered[index])
    if (selected.join("\n\n").length >= minimumCharacters) break
  }
  return { prompt: selected.join("\n\n"), key: "generated:prose:" + canonical, version: VERSION }
}

function generateQuoteRelay(quotes, seed, count) {
  var canonical = canonicalSeed("quote", seed)
  var random = seededRandom(hashSeed("quote:" + canonical))
  var longQuotes = shuffled(quotes.filter(function(quote) { return quote.text.split(/\s+/).length >= 20 }), random)
  var remaining = shuffled(quotes, random)
  var selected = []
  var authors = {}
  function add(quote) {
    if (!quote || authors[quote.author] || selected.indexOf(quote) >= 0) return false
    authors[quote.author] = true
    selected.push(quote)
    return true
  }
  for (var longIndex = 0; longIndex < longQuotes.length && selected.length < Math.min(2, count); longIndex++) add(longQuotes[longIndex])
  for (var index = 0; index < remaining.length && selected.length < count; index++) add(remaining[index])
  var promptParts = []
  var segments = []
  var cursor = 0
  selected.forEach(function(quote, index) {
    promptParts.push(quote.text)
    segments.push({ index: index + 1, start: cursor, end: cursor + quote.text.length - 1, author: quote.author, shortAuthor: quote.shortAuthor, total: selected.length })
    cursor += quote.text.length + 2
  })
  return { prompt: promptParts.join("\n\n"), segments: segments, key: "generated:quote:" + canonical, version: VERSION }
}

export { VERSION, generateCode, generateShell, generateWords, generateProse, generateQuoteRelay }
