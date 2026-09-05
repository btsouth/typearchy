# Release checks

## Release gate

A new user can do each of these without help. Each journey has an automated
check or a written script run on a clean machine against the deployed worker.

1. Install to first test in under a minute: `python3 tests/desktop-install.py`,
   then a manual launch from the application launcher on a machine that never
   had Typearchy.
2. Practice offline and see the result in history: `node tests/standalone-smoke.mjs`,
   then a manual run with networking disabled.
3. Connect the browser and link a second device: `challenges.integration.mjs`
   covers connect, browser linking, and recovery replacement; confirm once by
   hand from History with the Account in browser button.
4. Create a custom challenge, share the link, and have a friend race it before
   review: `challenges.integration.mjs` and `moderation.integration.mjs`.
5. Race a friend's shared run and publish the result: `race.browser.mjs` and
   `native-challenge-smoke.mjs`, then one real race from a shared `/a/` link.
6. Revisit results and tell local, unpublished, link-only, and public apart:
   `tests/model.test.mjs` covers the labels; check the result card and history
   rows by eye at the minimum window size.
7. Update the app from the previous tag with no lost data:
   `python3 tests/desktop-update.py` installs the previous tag in a private
   home, updates it from this checkout, and confirms history, account, the
   launcher, and link registration survive. Set `TYPEARCHY_PREVIOUS_TAG` to
   check an older release.

## Checks

- Run model and content tests.
- Run native practice, challenge, and standalone UI tests with isolated state.
- Test installation in a private home: migration, launcher, links, and updates.
- Verify the actual desktop launcher and a challenge URL on Omarchy.
- Verify one registered Typearchy handler and a working application icon.
- Check normal window behavior, practice pause/resume, and close confirmation.
- Run website tests, type checks, lint, build, and browser integration tests.
- Verify versions, README instructions, release notes, and the published website.
- Keep accounts, private state, test fixtures, and local planning notes out of Git.

Native UI tests require Quickshell. Desktop installation checks use a private
home and do not change the user's desktop registrations. Hosted challenge tests
must use the local test service, never publish synthetic scores as a real player.

## Automated usability sweep

`website/tests/practice.browser.mjs` checks every mode, code language, sprint
style and duration, pause/resume, saved results, inline profile setup, sharing,
and app-first setup connecting both clients. It runs against the disposable
local worker in CI. History unit tests cover imports in both directions,
deduplication, malformed backups, and excluding paused imports from bests.

Human review is for typing feel and visual judgment. Routine mode coverage,
connection behavior, and data preservation belong in the automated checks.

## History and progress acceptance

`website/tests/history.browser.mjs` checks migration with more than 500 runs,
simultaneous tabs, reload, exact passage retry, pagination, backup and restore,
blocked storage, and recovery from malformed original data. Challenge integration
checks private result retrieval and pagination across more than 100 tied attempts.
Browser history now uses IndexedDB; the original localStorage archive is retained
as a recovery backup. The profile does not automatically sync local practice.
