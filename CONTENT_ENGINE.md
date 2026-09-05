# Typearchy content engine

Typearchy generates practice locally from a versioned seed. The same engine
body is used by the desktop app and the browser game. A challenge key can
reproduce the exact prompt later, which is the basis for rematch links, ghosts,
and shared Daily runs.

## Modes

- Sprint Words draws from a large corpus without repeating a word before the
  available pool is exhausted. Short, medium, and long words are balanced.
- Sprint Prose assembles distinct curated passages to fill the selected clock.
- Drill ranks natural passages against recent weak keys and letter pairs, then
  builds a targeted paragraph without inserting synthetic symbols into words.
- Shell assembles parameterized, multiline workflows from distinct command
  families such as Git, systemd, networking, archives, files, and packages.
- Code emits complete Bash, Python, JavaScript, and Rust programs across 16
  structural families. Seeds switch between rolling and median statistics,
  grouping strategies, manifests and extension reports, and retries or batches,
  while also varying names, values, ordering, labels, and parameters.
- Prose shuffles distinct curated passages and joins enough material for the
  requested duration.
- Quote Relay selects four distinct authors, prioritizes substantial excerpts,
  and never invents or rewrites source material at runtime.

## Reproducibility

Each generator accepts either a fresh seed or one of its own challenge keys.
Passing the returned key back to that generator must reproduce the same prompt.
Keys are URL-safe and contain the content namespace plus a compact base-36
seed. Results record both the challenge key and engine version.

The public service can later publish only the Daily seed, engine version, and
competition metadata. Prompt generation can remain local. Exact historical
replays should retain the engine version with the run.

## Validity gate

`tests/content-engine.test.mjs` checks desktop and browser engine parity,
reproduction from challenge keys, prompt length, corpus balance, author
diversity, and shell syntax. It also generates twelve programs per language and
validates all 48 with `bash -n`, Python bytecode compilation, `node --check`,
and `rustc`. One generated fixture per language is also executed end to end.
Each language must cover at least eight structural families in the fixed test
matrix.

New code families should not ship until every seeded fixture passes its real
parser or compiler. New quotes require a source entry. Generated prose should
come from reviewed local packs, not runtime model output.
