.pragma library

var VERSION = "2026.08.5"

var MODES = ["sprint", "daily", "quote", "shell", "code", "drill", "custom"]

var WORDS = [
  "about", "above", "across", "after", "again", "agent", "almost", "along",
  "always", "amber", "among", "anchor", "answer", "anywhere", "arcade", "around",
  "array", "autumn", "balance", "because", "before", "behind", "between", "binary",
  "branch", "bright", "buffer", "build", "canvas", "carbon", "careful", "change",
  "circle", "client", "cloud", "coffee", "commit", "common", "compose", "continue",
  "create", "cursor", "daily", "debug", "desktop", "detail", "drift", "early",
  "echo", "editor", "ember", "enough", "every", "exact", "finish", "focus",
  "forest", "frame", "gentle", "graph", "great", "habit", "harbor", "inside",
  "index", "input", "kernel", "keyboard", "language", "layout", "light", "little",
  "local", "lunar", "matrix", "middle", "midnight", "moment", "motion", "native",
  "never", "often", "orbit", "output", "packet", "people", "pixel", "practice",
  "prompt", "quiet", "rapid", "render", "repeat", "result", "rhythm", "screen",
  "signal", "simple", "skill", "small", "solar", "source", "speed", "sprint",
  "static", "steady", "system", "terminal", "theme", "thread", "through", "timing",
  "token", "touch", "under", "useful", "vector", "velvet", "window", "winter",
  "without", "words", "work", "workspace", "write", "zenith",
  "ability", "access", "action", "active", "actual", "adapt", "address",
  "advance", "advice", "ahead", "allow", "alone", "already", "appear",
  "approach", "arrange", "arrive", "artist", "aspect", "avoid", "basic",
  "become", "begin", "believe", "better", "beyond", "border", "breeze",
  "bring", "broad", "browser", "button", "calm", "carry", "center",
  "certain", "chance", "clean", "clear", "close", "cluster", "color",
  "comfort", "command", "complete", "concept", "connect", "consider",
  "constant", "control", "correct", "craft", "data", "decision", "deep",
  "define", "design", "device", "direct", "discover", "distance", "divide",
  "document", "domain", "double", "dream", "drive", "eager", "earth",
  "easy", "effect", "energy", "engine", "enjoy", "enter", "equal", "event",
  "example", "explore", "fabric", "familiar", "feature", "field", "final",
  "flow", "fluid", "forward", "freedom", "fresh", "function", "future",
  "garden", "gather", "general", "golden", "ground", "group", "guide",
  "handle", "happen", "healthy", "hidden", "history", "honest", "horizon",
  "human", "idea", "imagine", "improve", "include", "inspire", "instant",
  "intent", "invite", "island", "issue", "journey", "joyful", "label",
  "learn", "level", "library", "listen", "logic", "machine", "manage",
  "master", "matter", "measure", "memory", "method", "model", "modern",
  "module", "natural", "network", "notice", "number", "object", "ocean",
  "open", "order", "ordinary", "organize", "pattern", "pause", "perfect",
  "place", "planet", "point", "possible", "power", "precise", "prefer",
  "present", "process", "product", "progress", "project", "protect",
  "purpose", "quality", "question", "ready", "reason", "record", "refine",
  "remain", "remember", "replace", "restore", "review", "river", "robust",
  "route", "sample", "scale", "select", "sentence", "session", "share",
  "sharp", "smooth", "solid", "solve", "spark", "stable", "start", "state",
  "stream", "strong", "structure", "study", "style", "target", "test",
  "text", "together", "tool", "train", "travel", "trust", "unique",
  "update", "value", "version", "view", "vision", "warm", "welcome",
  "whole", "wide", "wild", "wonder", "world", "young"
]

var DAILY_PASSAGES = [
  "A well-used keyboard carries its own map. The hands stop searching, the eyes stay with the thought, and each sentence arrives with less friction than the one before it.",
  "Speed is useful, but rhythm is what makes typing feel effortless. A calm pace leaves room for accuracy, and accuracy gives speed somewhere stable to grow.",
  "Tools change quickly while durable skills change slowly. Keeping both in practice makes it easier to choose the right tool without becoming dependent on any one of them.",
  "The quiet moments between commands are part of the work. Read the output, decide what matters, and let the next action be deliberate instead of merely fast.",
  "A desktop should disappear when concentration begins. Good defaults reduce decisions, clear typography reduces strain, and a responsive keyboard keeps thought close to action.",
  "Learning is often a collection of small corrections. Notice the difficult pair, slow down for one clean repetition, and let tomorrow's speed come from today's precision.",
  "An agent can draft, search, and organize at remarkable speed. The human still brings taste, judgment, and the practiced ability to turn a vague intention into a clear instruction.",
  "A short daily ritual is easier to keep than an ambitious weekly plan. Begin before motivation becomes a question, finish while the work still feels light, and return tomorrow.",
  "The best interface does not ask for attention. It places the next useful action within reach, responds without hesitation, and leaves the user feeling more capable than before.",
  "Writing by hand and speaking to an agent exercise different parts of thought. Keeping both available makes the transition between exploration and precision feel natural.",
  "Consistency is not sameness. It is the ability to return to a useful practice through changing schedules, shifting tools, and the ordinary interruptions of a busy day.",
  "Fast feedback makes practice honest. The number is not a verdict; it is a small measurement that helps the next attempt become calmer, cleaner, and more intentional.",
  "A command line rewards exact thinking. One missing character can change the result, so confidence grows from careful repetition before it becomes visible as speed.",
  "The first draft only needs to make the idea concrete. Once it exists, you can test it, question it, simplify it, and discover what it was trying to become.",
  "Good defaults are a form of hospitality. They help a new user begin quickly while leaving enough room for an experienced user to make the tool their own.",
  "Attention is easier to protect when the environment is quiet. Remove one distraction, choose one useful target, and let a small uninterrupted interval do its work.",
  "The fastest route is not always the shortest-looking one. A clear name, a small function, and a useful test can save hours of explanation later.",
  "A keyboard shortcut becomes valuable through repetition. At first it is something to remember; eventually it becomes a direct path between intention and action.",
  "Software gets better when its edges are exercised. Try the empty state, the slow path, the unexpected input, and the ordinary mistake someone will eventually make.",
  "There is pleasure in a system that responds immediately. The result appears, the next decision becomes obvious, and the tool feels like an extension of thought.",
  "The useful measure of practice is not one heroic score. It is the ability to return, settle into a rhythm, and perform cleanly on an ordinary day.",
  "A good review asks whether every part earns its place. Remove what distracts, strengthen what remains, and leave the next reader a clearer path through the work.",
  "Progress often hides inside familiarity. A task that once demanded full attention becomes natural, making room for harder questions and more ambitious ideas.",
  "The terminal is both a tool and a language. Fluency comes from understanding the shape of commands, not merely memorizing a list of convenient incantations.",
  "Precise work does not have to feel tense. Relax the shoulders, keep the hands light, and let accuracy establish a pace that speed can safely follow.",
  "A small feature can carry a large amount of care. Thoughtful spacing, useful feedback, and predictable behavior often matter more than a long list of capabilities.",
  "When a problem feels tangled, make one boundary visible. Name the input, describe the output, and reduce the unknown middle until it can be tested directly.",
  "The best habits survive imperfect days. A brief focused session keeps the thread intact and makes it easier to return with energy when more time is available.",
  "Computers are patient with repetition and unforgiving about ambiguity. Learning to communicate clearly with them can sharpen the way we explain ideas to people too.",
  "Craft lives in the choices nobody is forced to make. A useful detail, a cleaner transition, or one removed annoyance can change how the whole experience feels."
]

var DAILY_PROMPT_OFFSETS = [0, 11, 23]

function dailyPrompt(now) {
  var start = dayNumber(now) % DAILY_PASSAGES.length
  var parts = []
  for (var i = 0; i < DAILY_PROMPT_OFFSETS.length; i++)
    parts.push(DAILY_PASSAGES[(start + DAILY_PROMPT_OFFSETS[i]) % DAILY_PASSAGES.length])
  return parts.join(" ")
}

var QUOTES = [
  {
    author: "David Heinemeier Hansson",
    shortAuthor: "DHH",
    text: "I try to make simple, sharp tools."
  },
  {
    author: "David Heinemeier Hansson",
    shortAuthor: "DHH",
    text: "At the end of the day, you have to translate your prescriptions into running code."
  },
  {
    author: "Linus Torvalds",
    shortAuthor: "Linus Torvalds",
    text: "Find something that you're passionate about and just do it."
  },
  {
    author: "Linus Torvalds",
    shortAuthor: "Linus Torvalds",
    text: "Linux is evolution, not intelligent design."
  },
  {
    author: "Richard Stallman",
    shortAuthor: "Richard Stallman",
    text: "Free software is a matter of freedom, not price."
  },
  {
    author: "Ken Thompson",
    shortAuthor: "Ken Thompson",
    text: "One of my most productive days was throwing away 1,000 lines of code."
  },
  {
    author: "Margaret Hamilton",
    shortAuthor: "Margaret Hamilton",
    text: "We had to find a way and we did. Looking back, we were the luckiest people in the world."
  },
  {
    author: "Tim Peters",
    shortAuthor: "Tim Peters",
    text: "Beautiful is better than ugly. Explicit is better than implicit. Simple is better than complex. Readability counts."
  },
  {
    author: "Alan Kay",
    shortAuthor: "Alan Kay",
    text: "Is the best way to predict the future to invent it? Or to prevent it?"
  },
  {
    author: "David Heinemeier Hansson",
    shortAuthor: "DHH",
    text: "When reasonable people look at a piece of actual code, their differences tend to dissipate."
  },
  {
    author: "David Heinemeier Hansson",
    shortAuthor: "DHH",
    text: "It may sound nice, but is the code better? If not, call bullshit."
  },
  {
    author: "Dennis Ritchie",
    shortAuthor: "Dennis Ritchie",
    text: "What we wanted to preserve was not just a good environment to do programming, but a system around which a fellowship could form. We knew from experience that the essence of communal computing, as supplied from remote-access, time-shared machines, is not just to type programs into a terminal instead of a keypunch, but to encourage close communication."
  },
  {
    author: "Donald Knuth",
    shortAuthor: "Donald Knuth",
    text: "The main idea is to treat a program as a piece of literature, addressed to human beings rather than to a computer."
  },
  {
    author: "Donald Knuth",
    shortAuthor: "Donald Knuth",
    text: "The only way to gain enough efficiency to complete The Art of Computer Programming is to operate in batch mode, concentrating intensively and uninterruptedly on one subject at a time, rather than swapping a number of topics in and out of my head."
  },
  {
    author: "Grace Hopper",
    shortAuthor: "Grace Hopper",
    text: "There was no such thing as a programmer at that point. We had a code book for the machine and that was all. It listed the codes and what they did, and we had to work out all the beginning of programming."
  },
  {
    author: "Guido van Rossum",
    shortAuthor: "Guido van Rossum",
    text: "With ever-increasing hardware speed, the accumulated running time of a program during its lifetime is often negligible compared to the programmer time needed to write and debug it."
  },
  {
    author: "Doug McIlroy",
    shortAuthor: "Doug McIlroy",
    text: "If you read his programming, he doesn't put in many comments, but you don't need them. It just reads like a novel... that clarity just shines through in the original design of Unix."
  },
  {
    author: "Tim Peters",
    shortAuthor: "Tim Peters",
    text: "Special cases aren't special enough to break the rules. Although practicality beats purity. Errors should never pass silently. Unless explicitly silenced."
  },
  {
    author: "Tim Peters",
    shortAuthor: "Tim Peters",
    text: "Now is better than never. Although never is often better than right now. If the implementation is hard to explain, it's a bad idea. If the implementation is easy to explain, it may be a good idea."
  },
  {
    author: "Alan Kay",
    shortAuthor: "Alan Kay",
    text: "No one owes more to his research community than I do."
  },
  {
    author: "Grace Hopper",
    shortAuthor: "Grace Hopper",
    text: "It was a steady evolution to doing things easier and better, more correctly."
  }
]

var QUOTE_RELAYS = [
  { id: "craft", title: "CRAFT", quotes: [0, 5, 9, 12] },
  { id: "proof", title: "PROOF", quotes: [1, 10, 15, 7] },
  { id: "unix", title: "UNIX", quotes: [3, 11, 16, 5] },
  { id: "clarity", title: "CLARITY", quotes: [7, 17, 12, 15] },
  { id: "focus", title: "FOCUS", quotes: [13, 20, 0, 9] },
  { id: "pioneers", title: "PIONEERS", quotes: [14, 11, 16, 19] },
  { id: "freedom", title: "FREEDOM", quotes: [4, 3, 19, 11] },
  { id: "systems", title: "SYSTEMS", quotes: [3, 18, 10, 13] }
]

var SHELL_CHALLENGES = [
  [
    "git status --short",
    "git switch -c feature/typearchy",
    "rg --files | sort",
    "git diff --stat",
    "git log --oneline -5"
  ].join("\n"),
  [
    "systemctl --user status omarchy-shell",
    "journalctl --user -n 50 --no-pager",
    "ps -eo pid,comm,%cpu,%mem --sort=-%cpu",
    "free -h",
    "df -h /"
  ].join("\n"),
  [
    "find . -maxdepth 2 -type f",
    "rg -n \"TODO|FIXME\" .",
    "du -sh ./* | sort -h",
    "stat README.md",
    "sha256sum manifest.json"
  ].join("\n"),
  [
    "mkdir -p work/results",
    "cp README.md work/results/notes.md",
    "tar -czf work/results.tar.gz work/results",
    "file work/results.tar.gz",
    "printf '%s\\n' complete"
  ].join("\n"),
  [
    "git fetch --prune",
    "git branch --sort=-committerdate",
    "git show --stat --oneline HEAD",
    "git diff --check",
    "git status --short --branch"
  ].join("\n"),
  [
    "pacman -Q | sort",
    "pacman -Qo /usr/bin/bash",
    "pacman -Ql bash | head",
    "pacman -Qdtq",
    "checkupdates"
  ].join("\n"),
  [
    "ip -brief address",
    "ip route show default",
    "ss -tulpn",
    "resolvectl status",
    "ping -c 3 example.com"
  ].join("\n"),
  [
    "jq -r '.name' manifest.json",
    "sed -n '1,80p' README.md",
    "awk 'NF { count++ } END { print count }' README.md",
    "sort -u words.txt > words.sorted.txt",
    "comm -3 expected.txt actual.txt"
  ].join("\n"),
  [
    "tar -tf archive.tar.gz | head",
    "unzip -l release.zip",
    "curl -I https://example.com",
    "openssl dgst -sha256 release.tar.gz",
    "date -u +'%Y-%m-%dT%H:%M:%SZ'"
  ].join("\n"),
  [
    "systemd-analyze blame | head",
    "systemd-analyze critical-chain",
    "loginctl session-status",
    "journalctl -b -p warning --no-pager",
    "uptime"
  ].join("\n")
]

var CODE_CHALLENGES = {
  bash: [
    [
      "for file in \"$@\"; do",
      "  [[ -f $file ]] || continue",
      "  printf '%s\\t%s\\n' \"$(wc -l < \"$file\")\" \"$file\"",
      "done"
    ].join("\n"),
    [
      "while IFS= read -r line; do",
      "  [[ $line == '#'* ]] && continue",
      "  printf '%s\\n' \"${line,,}\"",
      "done < \"${1:-/dev/stdin}\""
    ].join("\n"),
    [
      "archive=\"release-$(date +%Y%m%d).tar.gz\"",
      "files=(README.md LICENSE manifest.json)",
      "tar -czf \"$archive\" \"${files[@]}\"",
      "sha256sum \"$archive\" > \"$archive.sha256\""
    ].join("\n"),
    [
      "set -euo pipefail",
      "root=$(git rev-parse --show-toplevel)",
      "cd \"$root\"",
      "mapfile -t files < <(rg --files -g '*.qml')",
      "printf 'found %d files\\n' \"${#files[@]}\""
    ].join("\n"),
    [
      "declare -A totals=()",
      "while read -r name count; do",
      "  totals[\"$name\"]=$(( ${totals[\"$name\"]:-0} + count ))",
      "done < usage.txt",
      "for name in \"${!totals[@]}\"; do",
      "  printf '%s %d\\n' \"$name\" \"${totals[$name]}\"",
      "done"
    ].join("\n"),
    [
      "cleanup() {",
      "  [[ -d ${workdir:-} ]] && rm -r -- \"$workdir\"",
      "}",
      "trap cleanup EXIT",
      "workdir=$(mktemp -d)",
      "cp -a config/. \"$workdir/\"",
      "find \"$workdir\" -type f -print0 | sort -z"
    ].join("\n"),
    [
      "readarray -t branches < <(git for-each-ref --format='%(refname:short)' refs/heads)",
      "for branch in \"${branches[@]}\"; do",
      "  printf '%-24s ' \"$branch\"",
      "  git rev-list --count \"$branch\"",
      "done"
    ].join("\n"),
    [
      "case ${1:-status} in",
      "  start) systemctl --user start \"$unit\" ;;",
      "  stop) systemctl --user stop \"$unit\" ;;",
      "  status) systemctl --user status \"$unit\" ;;",
      "  *) printf 'unknown action: %s\\n' \"$1\" >&2; exit 2 ;;",
      "esac"
    ].join("\n")
  ],
  python: [
    [
      "def moving_average(values, window):",
      "    if window < 1:",
      "        raise ValueError(\"window must be positive\")",
      "    return [sum(values[i:i + window]) / window",
      "            for i in range(len(values) - window + 1)]"
    ].join("\n"),
    [
      "def group_by(items, key_for):",
      "    groups = {}",
      "    for item in items:",
      "        key = key_for(item)",
      "        groups.setdefault(key, []).append(item)",
      "    return groups"
    ].join("\n"),
    [
      "from dataclasses import dataclass",
      "",
      "@dataclass(frozen=True)",
      "class Result:",
      "    wpm: float",
      "    accuracy: float"
    ].join("\n"),
    [
      "def chunks(values, size):",
      "    if size <= 0:",
      "        raise ValueError(\"size must be positive\")",
      "    for index in range(0, len(values), size):",
      "        yield values[index:index + size]"
    ].join("\n"),
    [
      "from pathlib import Path",
      "",
      "def source_files(root):",
      "    for path in Path(root).rglob(\"*.py\"):",
      "        if \".venv\" not in path.parts:",
      "            yield path",
      "",
      "files = sorted(source_files(\".\"))"
    ].join("\n"),
    [
      "def percentile(values, fraction):",
      "    ordered = sorted(values)",
      "    if not ordered:",
      "        return 0",
      "    index = round((len(ordered) - 1) * fraction)",
      "    return ordered[index]"
    ].join("\n"),
    [
      "def merge_counts(*groups):",
      "    merged = {}",
      "    for group in groups:",
      "        for key, value in group.items():",
      "            merged[key] = merged.get(key, 0) + value",
      "    return merged"
    ].join("\n"),
    [
      "def load_lines(path):",
      "    with open(path, encoding=\"utf-8\") as handle:",
      "        for line in handle:",
      "            value = line.strip()",
      "            if value and not value.startswith(\"#\"):",
      "                yield value"
    ].join("\n")
  ],
  javascript: [
    [
      "function groupBy(items, keyFor) {",
      "  return items.reduce((groups, item) => {",
      "    const key = keyFor(item)",
      "    ;(groups[key] ??= []).push(item)",
      "    return groups",
      "  }, {})",
      "}"
    ].join("\n"),
    [
      "export function clamp(value, low, high) {",
      "  return Math.max(low, Math.min(high, value))",
      "}",
      "",
      "const opacity = clamp(Number(input), 0, 1)"
    ].join("\n"),
    [
      "async function loadJson(url) {",
      "  const response = await fetch(url)",
      "  if (!response.ok) throw new Error(response.statusText)",
      "  return response.json()",
      "}"
    ].join("\n"),
    [
      "const unique = values => [...new Set(values)]",
      "const scores = unique(results.map(result => result.wpm))",
      "  .filter(score => score > 0)",
      "  .sort((a, b) => b - a)"
    ].join("\n"),
    [
      "export function median(values) {",
      "  const sorted = [...values].sort((a, b) => a - b)",
      "  const middle = Math.floor(sorted.length / 2)",
      "  if (!sorted.length) return 0",
      "  return sorted.length % 2",
      "    ? sorted[middle]",
      "    : (sorted[middle - 1] + sorted[middle]) / 2",
      "}"
    ].join("\n"),
    [
      "export async function readRuns(path) {",
      "  const file = await Bun.file(path).text()",
      "  return file.split('\\n')",
      "    .filter(Boolean)",
      "    .map(line => JSON.parse(line))",
      "    .filter(run => run.completed)",
      "}"
    ].join("\n"),
    [
      "function countBy(items, keyFor) {",
      "  const counts = new Map()",
      "  for (const item of items) {",
      "    const key = keyFor(item)",
      "    counts.set(key, (counts.get(key) ?? 0) + 1)",
      "  }",
      "  return counts",
      "}"
    ].join("\n"),
    [
      "const controller = new AbortController()",
      "const timeout = setTimeout(() => controller.abort(), 3000)",
      "try {",
      "  const response = await fetch(endpoint, { signal: controller.signal })",
      "  if (!response.ok) throw new Error(`HTTP ${response.status}`)",
      "  return await response.json()",
      "} finally {",
      "  clearTimeout(timeout)",
      "}"
    ].join("\n")
  ],
  rust: [
    [
      "fn clamp(value: i32, low: i32, high: i32) -> i32 {",
      "    value.max(low).min(high)",
      "}",
      "",
      "let scores = [72, 91, 84, 88];",
      "let best = scores.iter().copied().max().unwrap_or(0);"
    ].join("\n"),
    [
      "fn first_even(values: &[i32]) -> Option<i32> {",
      "    values.iter().copied().find(|value| value % 2 == 0)",
      "}",
      "",
      "let result = first_even(&[1, 3, 8, 13]);"
    ].join("\n"),
    [
      "#[derive(Debug, Clone, PartialEq)]",
      "struct Result {",
      "    wpm: f64,",
      "    accuracy: f64,",
      "}",
      "",
      "let run = Result { wpm: 86.0, accuracy: 98.5 };"
    ].join("\n"),
    [
      "fn normalize(input: &str) -> String {",
      "    input",
      "        .split_whitespace()",
      "        .collect::<Vec<_>>()",
      "        .join(\" \")",
      "}"
    ].join("\n"),
    [
      "fn mean(values: &[f64]) -> Option<f64> {",
      "    if values.is_empty() {",
      "        return None;",
      "    }",
      "    let total: f64 = values.iter().sum();",
      "    Some(total / values.len() as f64)",
      "}"
    ].join("\n"),
    [
      "use std::collections::HashMap;",
      "",
      "fn frequencies(words: &[&str]) -> HashMap<String, usize> {",
      "    let mut counts = HashMap::new();",
      "    for word in words {",
      "        *counts.entry(word.to_lowercase()).or_insert(0) += 1;",
      "    }",
      "    counts",
      "}"
    ].join("\n"),
    [
      "fn parse_scores(input: &str) -> Vec<i32> {",
      "    input",
      "        .lines()",
      "        .filter_map(|line| line.trim().parse().ok())",
      "        .filter(|score| *score > 0)",
      "        .collect()",
      "}"
    ].join("\n"),
    [
      "fn longest<'a>(left: &'a str, right: &'a str) -> &'a str {",
      "    match left.len().cmp(&right.len()) {",
      "        std::cmp::Ordering::Less => right,",
      "        _ => left,",
      "    }",
      "}"
    ].join("\n")
  ]
}

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value))
}

function pad2(value) {
  return String(value).padStart(2, "0")
}

function dateKey(date) {
  var value = date || new Date()
  return value.getUTCFullYear() + "-" + pad2(value.getUTCMonth() + 1) + "-" + pad2(value.getUTCDate())
}

function dayNumber(date) {
  var value = date || new Date()
  return Math.floor(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) / 86400000)
}

function hashSeed(text) {
  var hash = 2166136261
  var value = String(text || "")
  for (var i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
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

function randomIndex(seed, length) {
  if (length < 1) return 0
  return Math.floor(seededRandom(hashSeed(seed))() * length)
}

function timedPrompt(blocks, seed, minimumCharacters) {
  var random = seededRandom(hashSeed(seed))
  var order = []
  for (var i = 0; i < blocks.length; i++) order.push(i)
  for (var cursor = order.length - 1; cursor > 0; cursor--) {
    var swap = Math.floor(random() * (cursor + 1))
    var current = order[cursor]
    order[cursor] = order[swap]
    order[swap] = current
  }

  var selected = []
  var selectedIndices = []
  for (var index = 0; index < order.length; index++) {
    selected.push(blocks[order[index]])
    selectedIndices.push(order[index])
    if (selected.join("\n\n").length >= minimumCharacters) break
  }
  return { prompt: selected.join("\n\n"), key: selectedIndices.join("-") }
}

function generatedWords(seed, count, requiredCharacters) {
  var required = String(requiredCharacters || "").toLowerCase().split("")
  var random = seededRandom(hashSeed(seed))
  var out = []
  var previous = ""

  function shuffled(values) {
    var result = values.slice()
    for (var i = result.length - 1; i > 0; i--) {
      var swapIndex = Math.floor(random() * (i + 1))
      var swap = result[i]
      result[i] = result[swapIndex]
      result[swapIndex] = swap
    }
    return result
  }

  function focusBag() {
    var matching = []
    var general = []
    for (var i = 0; i < WORDS.length; i++) {
      var matches = false
      for (var j = 0; j < required.length; j++)
        if (WORDS[i].indexOf(required[j]) >= 0) matches = true
      if (matches) matching.push(WORDS[i])
      else general.push(WORDS[i])
    }
    matching = shuffled(matching)
    general = shuffled(general)
    var bag = []
    var matchIndex = 0
    var generalIndex = 0
    while (matchIndex < matching.length || generalIndex < general.length) {
      if (matchIndex < matching.length) bag.push(matching[matchIndex++])
      if (matchIndex < matching.length) bag.push(matching[matchIndex++])
      if (generalIndex < general.length) bag.push(general[generalIndex++])
    }
    return bag
  }

  while (out.length < count) {
    var bag = required.length > 0 ? focusBag() : shuffled(WORDS)
    if (bag.length > 1 && bag[0] === previous) {
      var first = bag[0]
      bag[0] = bag[1]
      bag[1] = first
    }
    for (var k = 0; k < bag.length && out.length < count; k++) out.push(bag[k])
    previous = out[out.length - 1]
  }
  return out.join(" ")
}

function countMatches(text, pattern) {
  var source = String(text || "").toLowerCase()
  var wanted = String(pattern || "").toLowerCase()
  if (!wanted) return 0
  var count = 0
  var index = 0
  while ((index = source.indexOf(wanted, index)) >= 0) {
    count++
    index += wanted.length
  }
  return count
}

function generatedDrill(seed, keys, bigrams) {
  var random = seededRandom(hashSeed(seed))
  var keyTargets = Array.isArray(keys) ? keys.slice(0, 2) : []
  var pairTargets = Array.isArray(bigrams) ? bigrams.slice(0, 2) : []
  var ranked = []
  for (var i = 0; i < DAILY_PASSAGES.length; i++) {
    var score = random()
    for (var k = 0; k < keyTargets.length; k++) score += countMatches(DAILY_PASSAGES[i], keyTargets[k])
    for (var p = 0; p < pairTargets.length; p++)
      score += countMatches(DAILY_PASSAGES[i], String(pairTargets[p]).replace("→", "")) * 4
    ranked.push({ index: i, score: score })
  }
  ranked.sort(function(a, b) { return b.score - a.score })
  var selected = ranked.slice(0, 3).map(function(entry) { return DAILY_PASSAGES[entry.index] })
  return { prompt: selected.join(" "), key: ranked.slice(0, 3).map(function(entry) { return entry.index }).join("-") }
}

function parseCustomPassages(raw) {
  return String(raw || "").split(/\n\s*\n/).map(function(passage) {
    return passage.trim().replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n")
  }).filter(function(passage) {
    return passage.length >= 10 && passage.length <= 4000
  }).slice(0, 200)
}

function buildQuoteRelay(relay) {
  var passages = []
  var segments = []
  var cursor = 0
  for (var i = 0; i < relay.quotes.length; i++) {
    var quote = QUOTES[relay.quotes[i]]
    passages.push(quote.text)
    segments.push({
      start: cursor,
      end: cursor + quote.text.length,
      author: quote.author,
      shortAuthor: quote.shortAuthor,
      index: i + 1,
      total: relay.quotes.length
    })
    cursor += quote.text.length + 1
  }
  return { prompt: passages.join("\n"), segments: segments }
}

function validMode(mode) {
  var value = String(mode || "")
  if (value === "focus") return "drill"
  return MODES.indexOf(value) >= 0 ? value : "sprint"
}

function validSprintStyle(style) {
  return String(style || "prose") === "words" ? "words" : "prose"
}

function validLanguage(language) {
  var value = String(language || "bash")
  return CODE_CHALLENGES[value] ? value : "bash"
}

function modeLabel(mode) {
  if (String(mode || "") === "words") return "WORDS"
  if (String(mode || "") === "focus") return "FOCUS"
  var value = validMode(mode)
  if (value === "daily") return "DAILY"
  if (value === "shell") return "SHELL"
  if (value === "code") return "CODE"
  if (value === "drill") return "DRILL"
  if (value === "quote") return "QUOTE RELAY"
  if (value === "custom") return "CUSTOM"
  return "SPRINT"
}

function dailyNumber(date) {
  var launch = Math.floor(Date.UTC(2026, 0, 1) / 86400000)
  return Math.max(1, dayNumber(date || new Date()) - launch + 1)
}

function buildChallenge(options) {
  var settings = options || {}
  var mode = validMode(settings.mode)
  var now = settings.now || new Date()
  var nonce = String(settings.nonce || now.getTime())
  var duration = [15, 30, 60].indexOf(Number(settings.duration)) >= 0 ? Number(settings.duration) : 30
  var sprintStyle = validSprintStyle(settings.sprintStyle)
  var language = validLanguage(settings.language)
  var drillKeys = Array.isArray(settings.drillKeys) ? settings.drillKeys.slice(0, 2) : []
  var drillBigrams = Array.isArray(settings.drillBigrams) ? settings.drillBigrams.slice(0, 2) : []
  var drillCalibrating = settings.drillCalibrating === true
  var prompt = ""
  var targetKind = "completion"
  var targetValue = 0
  var detail = ""
  var challengeId = ""
  var challengeKey = ""
  var author = ""
  var segments = []
  var available = true
  var generated = settings.generated && settings.generated.prompt ? settings.generated : null

  if (mode === "sprint") {
    var sprintBundle = generated || (sprintStyle === "words"
      ? { prompt: generatedWords("sprint-words-" + nonce, Math.min(WORDS.length, Math.max(160, Math.ceil(duration * 5.5)))), key: "words" }
      : timedPrompt(DAILY_PASSAGES, "sprint-prose-" + nonce, Math.max(680, duration * 18)))
    prompt = sprintBundle.prompt
    targetKind = "time"
    targetValue = duration
    detail = sprintStyle + " / " + duration + " seconds"
    challengeKey = "sprint:" + sprintStyle + ":" + duration + ":" + sprintBundle.key
  } else if (mode === "daily") {
    challengeId = String(dailyNumber(now))
    prompt = dailyPrompt(now)
    detail = "#" + challengeId
    challengeKey = "daily:" + challengeId
  } else if (mode === "quote") {
    var relay = QUOTE_RELAYS[randomIndex("quote-relay-" + nonce, QUOTE_RELAYS.length)]
    var relayContent = generated || buildQuoteRelay(relay)
    prompt = relayContent.prompt
    segments = relayContent.segments
    author = "Multiple voices"
    detail = generated ? "GENERATED RELAY" : relay.title
    challengeKey = generated ? relayContent.key : "quote-relay:" + relay.id
  } else if (mode === "shell") {
    var shellBundle = generated || timedPrompt(SHELL_CHALLENGES, "shell-" + nonce, Math.max(360, duration * 16))
    prompt = shellBundle.prompt
    targetKind = "time"
    targetValue = duration
    detail = duration + " seconds"
    challengeKey = "shell:" + duration + ":" + shellBundle.key
  } else if (mode === "code") {
    var codeBundle = generated || timedPrompt(CODE_CHALLENGES[language], "code-" + language + "-" + nonce, Math.max(360, duration * 16))
    prompt = codeBundle.prompt
    targetKind = "time"
    targetValue = duration
    detail = language + " / " + duration + " seconds"
    challengeKey = "code:" + language + ":" + duration + ":" + codeBundle.key
  } else if (mode === "drill") {
    var drillBundle = generatedDrill("drill-" + nonce, drillKeys, drillBigrams)
    prompt = drillBundle.prompt
    var drillLabels = drillKeys.concat(drillBigrams.map(function(pair) { return String(pair).replace("→", "") }))
    detail = (drillCalibrating ? "baseline " : "training ") + drillLabels.join(" / ")
    challengeKey = "drill:" + drillLabels.join("-") + ":" + drillBundle.key
  } else {
    var customPassages = Array.isArray(settings.customPassages) ? settings.customPassages : []
    if (customPassages.length > 0) {
      var customIndex = randomIndex("custom-" + nonce, customPassages.length)
      prompt = String(customPassages[customIndex])
      detail = "local passage " + (customIndex + 1) + " / " + customPassages.length
      challengeKey = "custom:" + hashSeed(prompt).toString(36)
    } else {
      prompt = "Add one passage per paragraph, then return to begin."
      detail = "no local passages"
      challengeKey = "custom:empty"
      available = false
    }
  }

  return {
    version: VERSION,
    mode: mode,
    label: modeLabel(mode),
    detail: detail,
    prompt: prompt,
    targetKind: targetKind,
    targetValue: targetValue,
    language: language,
    author: author,
    segments: segments,
    challengeId: challengeId,
    challengeKey: challengeKey,
    sprintStyle: sprintStyle,
    drillKeys: drillKeys,
    drillBigrams: drillBigrams,
    drillCalibrating: drillCalibrating,
    duration: duration,
    available: available,
    engineVersion: generated ? generated.version || "" : ""
  }
}
