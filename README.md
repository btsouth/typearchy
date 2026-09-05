# Typearchy

[Play in the browser](https://typearchy.com) · [Install for Omarchy](#install)

![Typearchy](website/public/og.png)

Typearchy is a local-first typing game. Launch it from your application launcher
in a normal desktop window, with optional fullscreen and colors from your
Omarchy theme. The desktop app runs independently of the shell.

Practice works without an account or network connection. Practice results and
insights stay on the device unless you explicitly share a result. Online challenges
use the shared service to validate completed attempts and race other players.

## Included

- Timed Sprint tests with generated Words or grammatical Prose
- One full-paragraph deterministic UTC daily challenge for every user
- A large, rolling prompt that advances without blocking input
- Curated Quote Relay, Shell, Code, adaptive Drill, and local Custom modes
- Bash, Python, JavaScript, Rust, and Ruby code practice
- A seeded content engine for balanced words, shell workflows, prose, quote relays, and complete code programs
- Reproducible challenge keys and exact URL rematches
- Eight themed Quote Relays with attributed excerpts and a maintained source list
- WPM, raw WPM, accuracy, consistency, and error counts
- Per-key and bigram mistake tracking with readable, targeted drills
- Filtered local history, recent trends, personal bests, and streak tracking
- Optional live stats, a personal-best pace ghost, and three type sizes
- A normal application window with optional fullscreen and automatic practice pause on focus loss
- Shareable result URLs with theme-matched social previews and interactive playback
- Optional PNG result cards saved locally and copied to the clipboard
- Reviewed prose and Rails challenges with recorded opponents and shared standings
- Custom challenges saved for review before other players can see them
- Optional public handles with three pinned runs and replayable pace ghosts
- Automatic Omarchy theme colors and typography

## Install

On Omarchy, install from a terminal:

```bash
git clone https://github.com/btsouth/typearchy.git
./typearchy/bin/typearchy-install
```

Launch **Typearchy** from your application launcher. No bar plugin is required.
Challenge links open the same app window.

On another Linux desktop, install Python 3.11+, Quickshell 0.3.1+, `curl`, `jq`,
and `xdg-utils` first. `wl-clipboard` enables copying links and cards on Wayland.

To update, close Typearchy and run:

```bash
git -C typearchy pull --ff-only
./typearchy/bin/typearchy-install
```

Upgrading from the plugin disables its bar entry, removes its duplicate link
handler, and preserves your account and history. Original history and desktop
settings are backed up under `~/.local/state/typearchy/`.

For development, run `./bin/typearchy` directly. Set `TYPEARCHY_STATE_DIR` to a
private directory to keep tests separate from your real account and history.

## Website

The browser client and Typearchy website live in `website/`.

```bash
cd website
npm ci
npm run dev
```

Production builds target Cloudflare Workers through Vinext.

## Use

- Open Typearchy from your application launcher. History is available in the app.
- Press `F11` for fullscreen. Windowed mode keeps other applications accessible.
- Start typing to begin the timer.
- Press `Backspace` to correct. `Escape` pauses local practice.
- Switching away pauses local practice. Resumed runs stay in history but do not
  count toward uninterrupted personal bests or shared results. Online races keep
  their clock running when you switch away.
- Press `Ctrl+Backspace` to erase the current word.
- Press `Ctrl+R` to restart immediately.
- Type `Enter` at visible return markers in Shell and Code modes.
- Quote Relay advances through four attributed excerpts under one timer.
- Press `H` before or after a test to open history and preferences.
- On results, use the visible actions or press `Ctrl+R` to retry, `Ctrl+S` to
  share a result URL, `Ctrl+C` to copy its link, or `Ctrl+H` to open history. Ordinary
  typing is ignored so a finished result cannot disappear accidentally.
- In History, connect a public profile with one browser step. Publishing,
  pinning, unpinning, and removing a public run are always explicit. A
  connected profile can also be hidden from the website at any time without
  disconnecting.

Before a test starts:

- Press `Tab` or `Shift+Tab` to cycle through modes.
- In Sprint, choose Words or Prose, then press `1`, `2`, or `3` for 15, 30,
  or 60 seconds. `W` and `P` switch the content directly.
- In Code, choose Bash, Python, JavaScript, Rust, or Ruby onscreen.
- In Custom, press `O` to open the local passage file.

In history, press `0` through `8` to filter by mode. Press `L` to toggle live
stats, `G` to toggle the pace ghost, or `F` to cycle the prompt size.

## Shared challenges

Open Challenges in the browser or desktop app. Pick a reviewed passage,
including attributed Ruby on Rails excerpts, or submit your own text for review.
The passage and correction rules stay fixed so everyone races the same test.

Guests can play. Connect a profile to publish a result and enter the standings.
Share the result URL: it includes a social preview, playback, and a **Race this
run** action. Each result keeps the selected theme. The native client uses the
current Omarchy palette; browser practice offers six themes.

Online attempts send input and timing when the test finishes so the server can
calculate the score. The server keeps sanitized passage progress, not incorrect
keystrokes. These checks establish consistent scores; they do not prove a player
is human. Old practice results remain separate from challenge standings.

Custom submissions are private to their creator until reviewed. Reports go to the
moderation queue. Profile visibility and per-result publishing remain explicit.
Recovery codes and linked devices are managed under Account.

## Local data

Statistics:

```text
~/.local/state/typearchy/desktop/stats.json
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

The optional profile credential is stored with user-only permissions at:

```text
~/.local/state/typearchy/profile.json
```

Quote attributions are documented in [QUOTE_SOURCES.md](QUOTE_SOURCES.md).
The local generation and validation contract is documented in
[CONTENT_ENGINE.md](CONTENT_ENGINE.md).
The opt-in result URL and privacy boundary are documented in
[SHARING_CONTRACT.md](SHARING_CONTRACT.md).

Personal streaks use the machine's local calendar. The shared Daily challenge
uses UTC so every player receives the same prompt. History is capped at the
latest 500 tests. Ordinary practice shares scores and a pace series. Online
challenges share an approved passage and sanitized progress replay; incorrect
keystrokes never appear in public playback.

## Development checks

```bash
node tests/model.test.mjs
node tests/content-engine.test.mjs
node tests/native-practice-smoke.mjs
node tests/native-challenge-smoke.mjs
node tests/standalone-smoke.mjs
python3 tests/desktop-install.py
cd website
npm ci
npm test
npx tsc --noEmit
npm run lint
npm run build
```
