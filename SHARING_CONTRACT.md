# Typearchy sharing contract

Typearchy remains complete offline. Sharing is an explicit, optional action on
the finished-result screen. The plugin must never upload in the background.

## Public result URL

The first hosted sharing release uses one durable URL:

```text
https://typearchy.com/r/7K2M9Q
```

The result page is an immutable score receipt and a rematch invitation. It
shows the score, mode, challenge identity, accuracy, consistency, pace, and
personal-best delta. Its primary action is `BEAT THIS RUN`, which starts the
same reproducible challenge in the web demo and explains how to open it in the
Omarchy plugin.

Public profiles use `typearchy.com/u/handle` and may reference selected result
receipts. They never replace the immutable result URL or create a second
challenge format. Typearchy does not add a feed.

## Explicit upload

Creating a link may send only:

- schema and content version
- mode and reproducible challenge key or seed
- duration or word target
- WPM, raw WPM, accuracy, consistency, and error count
- a decimated WPM pace series
- optional Omarchy theme identifier for card rendering

It must never send:

- the prompt or custom passage
- typed text
- individual keystrokes or correction timing
- local history
- machine identifiers or account identifiers on anonymous receipts

When a signed-in player explicitly adds a run to a public profile, the receipt
may also store that Typearchy user ID. It never receives a GitHub token or email.

Custom mode cannot create a public rematch unless the user separately chooses
to publish the passage. That is outside the first release.

## Result-screen behavior

When the service exists, the deliberate result actions become:

1. `RETRY`
2. `COPY LINK`
3. `SAVE CARD`
4. `HISTORY`

`COPY LINK` creates the hosted receipt only when pressed. Offline failure keeps
the local PNG and text sharing flow available. The first successful share
briefly states exactly which score fields are leaving the machine.

## Hosted components

- Cloudflare Worker for result creation and lookup
- D1 for immutable score receipts and daily aggregates
- R2 only if rendered social cards need durable caching
- rate limiting at the edge
- dynamic Open Graph and X cards for every result URL

Public scores are self-reported. Typearchy should not claim cheat-proof global
rankings. Daily comparisons can be labeled community results and filtered for
obvious impossible values.

## Core rule

The optional sharing service cannot be required by the Omarchy plugin. A core
review must be able to remove the hosted feature without weakening the typing
game, local history, Focus practice, or personal-best ghost.

Public profile behavior, desktop linking, privacy controls, and deletion are
defined in `PROFILE_CONTRACT.md`.
