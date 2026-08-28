# Typearchy public profile contract

Public profiles are an optional speed résumé for people who want to show their
typing ability. They are not a prerequisite for the game and they are not a
social network.

## Product surface

Each profile has one durable URL:

```text
https://typearchy.com/u/handle
```

The page contains:

- handle, optional display name, avatar, short bio, and Omarchy theme
- personal bests separated by mode and test length
- recent-ten average, accuracy, consistency, and current streak
- a progression chart made only from comparable tests
- selected public runs with immutable result URLs
- one pinned ghost replay built from a selected run's decimated pace series
- one direct challenge action

It does not contain followers, a feed, direct messages, public email, comments,
reactions, or automatically published local activity.

## Identity and ownership

The website uses GitHub sign-in to claim and manage a handle. Profile viewing,
playing, rematching, and the entire Omarchy plugin remain account-free.

The website performs the GitHub authorization flow and stores only the stable
GitHub user ID plus the public identity fields the player chooses to mirror.
The desktop plugin never receives or stores a GitHub access token.

## Desktop linking

The plugin links through a short-lived Typearchy code:

1. The player signs in at `typearchy.com/connect`.
2. The site shows a one-time code that expires after 15 minutes.
3. The player enters the code in Typearchy settings.
4. The server returns a scoped Typearchy device token.
5. The plugin stores that token in a user-only file and shows the linked handle.

Device tokens may submit score summaries. They cannot change GitHub identity,
rename or delete the profile, inspect other private runs, or create new device
tokens. Every device is named, dated, visible on the website, and revocable.

## Publishing defaults

Enabling a profile does not publish local history.

- `Publish personal bests` is offered during setup and is opt-in.
- `Publish every completed run` is off by default.
- `Add this run to profile` is available on a finished result.
- `Pin as profile ghost` is available only for an already-public run.
- Removing a run from the profile does not delete the local run.
- Deleting a public result removes it from the profile and makes its receipt
  unavailable after a short cache-expiry window.

Only the score fields already allowed by `SHARING_CONTRACT.md` may leave the
machine. Custom passages cannot be published in the first profile release.

## Pinned ghost replay

A player may pin one public run as the profile's featured ghost. Visitors can
play, pause, or scrub a 2x replay of its pace, compare it with the player's
previous best, and launch the same challenge.

The replay is reconstructed from the receipt's decimated WPM pace series. It
does not contain typed text, individual key events, correction timing, or a
recording of the desktop. Pinning a different run immediately replaces the old
featured ghost without changing either result receipt.

## Privacy controls

Players can:

- make the whole profile public or private
- hide individual modes, metrics, or runs
- change the handle with a cooldown and redirect the old handle temporarily
- revoke any linked device
- export their public profile data
- delete the profile and all hosted runs

Email is never public. Typed text, individual keystrokes, corrections, custom
passages, local history, machine details, and IP-derived location never appear
on a profile.

## Score language

Desktop scores are recorded by Typearchy but self-reported by an unsandboxed
client. The product must not call them cheat-proof or verified. Test labels
always include enough context to compare the score fairly, such as `Sprint / 30
sec` or `Code / Rust`.

## Cloudflare data model

D1 owns durable public identity and score data.

```text
users
  id, github_user_id, created_at, deleted_at

profiles
  user_id, handle, display_name, avatar_url, bio, theme_key,
  visibility, created_at, updated_at

devices
  id, user_id, token_hash, label, created_at, last_used_at, revoked_at

runs
  id, slug, user_id, schema_version, content_version, mode,
  challenge_key, target, wpm, raw_wpm, accuracy, consistency,
  errors, pace_json, visibility, created_at, deleted_at
```

Required indexes cover normalized handle lookup, a player's visible runs by
date, and challenge results by date. Aggregates should be derived until real
traffic proves a materialized table is necessary.

## Abuse and lifecycle

- reserve product, system, and impersonation-prone handles
- normalize handles case-insensitively and allow only safe ASCII characters
- rate-limit handle changes, device linking, and score publication
- sanitize display names and bios as plain text
- keep an audit trail for destructive account actions without retaining scores
- provide a clear report path before profiles become generally discoverable
- render record-specific metadata and social images for each public profile

Profiles are reachable by direct URL at launch. A global people directory is
not required. Discovery can wait until moderation and real demand justify it.
