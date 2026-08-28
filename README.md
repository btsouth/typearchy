# Typearchy

[Play in the browser](https://typearchy.com) · [Install for Omarchy](#install)

![Typearchy](website/public/og.png)

Typearchy is a local-first typing game for the Omarchy shell. It adds a compact
bar launcher, a focused fullscreen typing experience, and a movable, resizable
History window that follows the current Omarchy theme.

The game works without an account or network connection. Results and practice
insights stay on the local machine.

## Included

- Timed Sprint tests with generated Words or grammatical Prose
- One full-paragraph deterministic UTC daily challenge for every user
- A large, two-line rolling prompt that advances without blocking input
- Curated Quote Relay, Shell, Code, adaptive Drill, and local Custom modes
- Bash, Python, JavaScript, and Rust code practice
- A seeded content engine for balanced words, shell workflows, prose, quote relays, and complete code programs
- Reproducible challenge keys that can power exact URL rematches later
- Eight themed Quote Relays with attributed excerpts and a maintained source list
- WPM, raw WPM, accuracy, consistency, and error counts
- Per-key and bigram mistake tracking with readable, targeted drills
- Filtered local history, recent trends, personal bests, and streak tracking
- Optional live stats, a personal-best pace ghost, and three type sizes
- A keyboard-and-bolt bar widget with a quick-launch panel
- Pace graphs and PNG result cards saved locally and copied to the clipboard
- Automatic Omarchy theme colors and typography

## Install

```bash
omarchy plugin add https://github.com/tsouth89/typearchy.git --enable
```

For local development, run these commands from the repository's parent directory:

```bash
omarchy plugin validate ./typearchy
cp -R ./typearchy ~/.config/omarchy/plugins/dev.typearchy.game
omarchy plugin enable dev.typearchy.game
```

## Website

The browser client and Typearchy website live in `website/`.

```bash
cd website
npm ci
npm run dev
```

Production builds target Cloudflare Workers through Vinext.

## Use

- Left-click the bar widget to open quick actions and local stats.
- Right-click the bar widget to start the saved Sprint duration immediately.
- Open History from the bar panel for a normal desktop window. In Omarchy,
  `Super+T` toggles that window between tiled and floating.
- Start typing to begin the timer.
- Press `Backspace` to correct, or `Escape` to close.
- Press `Ctrl+Backspace` to erase the current word.
- Press `Ctrl+R` to restart immediately.
- Type `Enter` at visible return markers in Quote Relay, Shell, and Code modes.
- Quote Relay advances through four attributed excerpts under one timer.
- Press `H` before or after a test to open history and preferences.
- On results, use the visible actions or press `Ctrl+R` to retry, `Ctrl+S` to
  save a card, `Ctrl+C` to copy text, or `Ctrl+H` to open history. Ordinary
  typing is ignored so a finished result cannot disappear accidentally.

Before a test starts:

- Press `Tab` or `Shift+Tab` to cycle through modes.
- In Sprint, choose Words or Prose, then press `1`, `2`, or `3` for 15, 30,
  or 60 seconds. `W` and `P` switch the content directly.
- In Code, choose Bash, Python, JavaScript, or Rust onscreen.
- In Custom, press `O` to open the local passage file.

In history, press `0` through `8` to filter by mode. Press `L` to toggle live
stats, `G` to toggle the pace ghost, or `F` to cycle the prompt size.

## Local data

Statistics:

```text
~/.local/state/typearchy/stats.json
```

Custom passages:

```text
~/.local/share/typearchy/passages.txt
```

Separate custom passages with a blank line. Each passage stays on the local
machine.

Share cards:

```text
~/Pictures/Typearchy/
```

Quote attributions are documented in [QUOTE_SOURCES.md](QUOTE_SOURCES.md).
The local generation and validation contract is documented in
[CONTENT_ENGINE.md](CONTENT_ENGINE.md).
The future opt-in result URL and privacy boundary are documented in
[SHARING_CONTRACT.md](SHARING_CONTRACT.md).

Personal streaks use the machine's local calendar. The shared Daily challenge
uses UTC so every player receives the same prompt. History is capped at the
latest 500 tests. Share cards contain scores only, never the passage or typed
text.

## Development checks

```bash
node tests/model.test.mjs
node tests/content-engine.test.mjs
omarchy plugin validate .
```
