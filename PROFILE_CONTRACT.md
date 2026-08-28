# Typearchy public profile contract

Public profiles are optional proof pages for selected typing runs. They are not
required to play Typearchy and they are not a social network.

## Product surface

Each profile has one durable URL:

```text
https://typearchy.com/u/handle
```

It shows a handle, useful aggregates from published runs, and at most three
pinned runs. The primary pin includes a replayable pace ghost and every pin can
launch its reproducible challenge. There are no followers, feeds, comments,
reactions, private messages, or public contact details.

## Identity and recovery

Profiles are device-owned. Typearchy does not require email, a password, GitHub,
or another identity provider.

1. The app creates a random device token and requests a connection code.
2. The app opens `typearchy.com/connect` with that short-lived code.
3. The player claims an available handle.
4. The website stores only a hash of the device token.
5. The app detects the completed connection automatically.

The connection expires after 15 minutes. The raw device token stays in a
user-only local file and is never included in a command-line argument. A
one-time recovery code is shown after claiming the handle. Recovery rotates
that code, revokes previous device access, and connects the new device.

Disconnecting in the app revokes that device. It does not remove other devices,
the profile, or published runs.

Deleting the profile requires a second confirmation in the app. It removes the
profile and every public run while preserving all local history.

## Publishing

Nothing uploads automatically. A player must publish each finished run from the
result screen or local history. Custom passages cannot be published.

The service accepts only:

- schema and content version
- mode, duration, target label, and reproducible challenge key
- WPM, raw WPM, accuracy, consistency, and error count
- a decimated WPM pace series
- completion time

It never accepts the prompt, typed text, individual keystrokes, correction
timing, local mistake history, machine identity, or IP-derived location.

Publishing creates an immutable result URL. The app can pin or unpin that run,
copy its URL, or remove the public copy. Removing it keeps the local result.

## Pinned run replay

Profiles allow three pins. The newest pin is the primary run. Its pace ghost is
reconstructed from aggregate WPM samples and can be played, paused, or scrubbed.
It is not a screen recording and contains no typed text or key events.

## Score language

Desktop scores are self-reported by an unsandboxed client. Typearchy does not
call them verified or cheat-proof. Every receipt identifies the mode, target,
duration, accuracy, and challenge so visitors can compare it fairly.

## Hosted data

Cloudflare D1 stores profiles, hashed recovery secrets, hashed device tokens,
short-lived connections, published runs, pins, and rate-limit counters. Public
aggregates are derived from published runs. There is no global player directory.

Handles are case-insensitive, limited to safe ASCII characters, and checked
against reserved product and system names. Connection, recovery, and publishing
endpoints are rate-limited.
