# Release checks

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
