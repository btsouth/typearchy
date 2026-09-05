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
   hand from History with the Browser button.
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
