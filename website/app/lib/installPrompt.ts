// Chrome and Edge hand the page a one-shot install prompt. It is kept here until the player asks for
// it, because the event is only offered once per page load.

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export function rememberInstallPrompt(event: Event) {
  deferred = event as InstallPromptEvent;
  notify();
}

export function installAvailable() {
  return deferred !== null;
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function promptInstall() {
  const event = deferred;
  deferred = null;
  notify();
  if (event) await event.prompt();
}
