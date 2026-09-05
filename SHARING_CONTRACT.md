# Typearchy sharing contract

Practice remains usable offline. Sharing a practice result and publishing an
online challenge result are explicit actions. URL sharing is primary; local image
export is optional. Typearchy never captures input outside its active typing field.

## Result URLs

- `/r/:slug` is a practice result with scores, pace, and a reproducible rematch.
- `/c/:slug` is an immutable, approved passage with fixed rules and standings.
- `/a/:slug` is a published attempt with progress playback and an invitation to
  race that exact run on its original challenge.
- `/u/:handle` contains the player's selected public results and challenges.

Result pages and Open Graph images use the saved theme palette. Only six hex
colors are accepted; supplied names, markup, and CSS are ignored. Text colors are
adjusted for readability when necessary. Preset names come from the known palette.
Sharing the same practice run again returns its existing URL.

## Practice uploads

A deliberate practice share sends content version, mode, challenge key, target,
duration, aggregate scores, a bounded pace series, client run ID, and theme colors.
It does not upload the prompt, custom passage, typed text, individual keystrokes,
or local history. A public profile is required to create a public result URL.

Custom practice stays local. Publishing a custom passage is a separate creator
flow. The link works immediately; review gates library listing. Failed sharing
preserves the local result.
Copy Link copies a URL; Export Image remains available in the native client.

## Online challenge validation

Starting an online challenge creates a short-lived attempt session. The active
race records input and relative timing locally. Completion sends the recording
for server replay validation, even if the player has not chosen to publish it.
This collection is explained before the race starts. The server calculates all
competitive scores; client-supplied totals cannot set a ranked result.

The server stores aggregate scores, sanitized progress samples, and a recording
hash. It discards raw input after validation. Public progress shows position within
the approved passage, never the player's incorrect keystrokes. Recordings and
session credentials must never appear in logs, result URLs, or public API fields.

A guest may complete a challenge, then connect a profile and claim the result.
Only published results from public profiles appear in standings. Ordinary practice
scores remain self-reported and never enter competitive standings. Replay
validation does not establish human identity or make the game cheat-proof.

## Publication and removal

Challenge visibility has two levels. A challenge is reachable by link when its
creator has not hidden it, a moderator has not rejected it, and the creator's
profile is public. It is listed in the library, on profile pages, and to search
engines only when the creator chose public and a moderator approved it. Exact
reviewed catalog entries are approved on save. Custom titles, passages, and
attribution enter the review queue but are shareable by link right away. Titles
may not contain links because they appear on social cards before review, and a
profile may hold at most 20 unreviewed passages. Results published on an
unreviewed passage join that passage's standings and open by link, but stay off
public profiles until approval. Rejection hides challenge and result pages,
public API content, and freshly requested social cards. A hidden creator profile
also hides its challenges. A player can unpublish an attempt or hide their profile.
Deleting an account removes its server-owned challenges and results. Public
profiles can be reported for abusive handles or impersonation. Moderator
restrictions hide the profile and its public content until explicitly restored.

These controls cannot erase previews already cached by another service. Typearchy
serves dynamic social images without its own durable public image cache.

## Retention and recovery

Completed browser attempts remain in the current tab's session storage for retry;
raw events are removed after the server acknowledges the upload. Closing the tab
clears this recovery data. Native retry data stays in the private state directory.
Credentials are private files and are never exposed to QML or shared links.

Attempt sessions expire after 20 minutes. A bounded, opportunistic cleanup removes
old unfinished sessions and guest results unclaimed for over seven days. The
service does not promise an exact deletion deadline during periods of inactivity.
The Worker deploys with `npm run deploy:production` from `website/`; D1 migrations
run with `wrangler d1 migrations apply` before each deploy.

## Hosted components

The existing Cloudflare Worker issues sessions and validates completed recordings.
D1 stores accounts, approved passages, aggregate results, and sanitized progress.
There are no per-keystroke database writes. Open Graph rendering bundles its font
with the Worker and makes no remote font request. R2 is not required.

The optional service does not replace local practice, history, drills, or personal
best tracking. Profile linking and recovery build on the existing account system.
