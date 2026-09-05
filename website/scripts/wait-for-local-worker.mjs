import { setTimeout as wait } from 'node:timers/promises';
const deadline = Date.now() + 60000;
while (Date.now() < deadline) {
  try {
    const response = await fetch('http://localhost:5178/api/session', { signal: AbortSignal.timeout(2000) });
    if (response.ok && (await response.json()).handle === null) process.exit(0);
  } catch { /* The local worker is still starting. */ }
  await wait(500);
}
throw new Error('The local built worker did not become ready within one minute');
