import { headers } from 'next/headers';
import { authenticateDevice } from './db';

export async function currentViewer() {
  return authenticateDevice(new Request('https://typearchy.com', { headers: await headers() }));
}
