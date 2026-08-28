# Typearchy product direction

## Product promise

Typearchy should make a short typing session feel like a native part of the
desktop. Opening a test must be faster than opening a site, the interface must
follow the active Omarchy theme, and local use must never require an account.

## Positioning hypothesis

AI agents and voice dictation reduce how much many developers type by hand.
Typearchy can be the short daily ritual that keeps those keyboard skills from
going stale.

Leading message:

> AI changed how you work. Typearchy keeps your typing sharp.

Supporting lines:

- Talk to your agents. Train your fingers.
- Dictate the work. Keep the skill.
- Your agents can do the typing. Typearchy keeps you sharp.
- Keep your fingers in the loop.

The tone should be pro-AI and pro-skill. Typearchy complements agentic work
instead of scolding people for using it.

## Product surfaces

### Bar widget

- Uses one standard monochrome icon slot with a bolt overlaid on the keyboard
- Shows today's best WPM in the tooltip and quick panel
- Opens a compact local stats panel
- Right-click starts a sprint immediately

### Stats panel

- Shows today's best, all-time best, streak, and test count
- Starts Sprint, Daily, or adaptive Drill mode
- Opens filtered history, trends, practice guidance, and preferences
- Copies the latest result as text

### Fullscreen game and windowed History

- Provides a focused, keyboard-only test
- Starts timing on the first typed character
- Shows live WPM, accuracy, and time
- Offers Sprint with Words or Prose, plus Daily, Quote Relay, Shell, Code,
  Drill, and Custom modes
- Learns weak keys and letter pairs from local mistakes
- Races a comparable personal-best pace without sending data anywhere
- Produces an Omarchy-themed result card
- Opens deep history and preferences in a normal movable, resizable window

## Local-first rules

- No analytics or telemetry
- No network calls
- No accounts
- No typed passage or keystroke history in share cards
- Only the latest 500 result summaries are retained
- Stats remain readable JSON so users can inspect and back them up

## Release scope

### 1.0: local foundation

- Recent WPM trends and local history filters
- Personal-best comparisons and pace ghost races
- Custom local passages
- Live-stat, ghost, and prompt-size preferences
- Expanded Daily, Shell, and Code content
- Result-safe input, richer share cards, and WPM pace graphs
- Fullscreen tests with a separate desktop History window

## Next milestones

### Next: community-ready

- Public git installation flow
- Settings exposed through the plugin manifest if Omarchy adds support
- Broader accessibility and input-method testing
- Multiple monitor testing
- A reviewed passage corpus and contributor guide
- Optional export and import for local history

### Optional community layer

- Cloudflare Worker API with D1 storage
- Short immutable result URLs that invite a same-challenge rematch
- Dynamic Open Graph and X cards for shared results
- Explicit score-only upload with a local fallback
- Optional pseudonymous handles with no OAuth requirement
- Rate-limited daily and challenge rankings
- A small web result page at typearchy.com

The Cloudflare layer must stay optional and separate from the local stats
store. The game should remain fully useful offline, and typed text should never
be uploaded.

## MVP success criteria

- Install to first test in under one minute
- Overlay opens without a new process or visible loading state
- Test restarts with one key
- Results survive a shell restart
- Share creates a usable image without uploading anything
- The closed plugin has no polling loop or background process
