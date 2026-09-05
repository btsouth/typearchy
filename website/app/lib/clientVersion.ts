import { ClientError } from './clientError.ts';

// The desktop app identifies itself with `X-Typearchy-Client: desktop/<version>`.
// Raise MINIMUM_DESKTOP_CLIENT only when an API change breaks older apps; the
// browser client always ships with the server and never sends the header.
export const LATEST_DESKTOP_CLIENT = '1.4.0';
export const MINIMUM_DESKTOP_CLIENT = '1.0.0';

export function compareVersions(left: string, right: string) {
  const a = left.split('.').map(part => Number.parseInt(part, 10) || 0);
  const b = right.split('.').map(part => Number.parseInt(part, 10) || 0);
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) < (b[index] || 0) ? -1 : 1;
  }
  return 0;
}

export function parseClientHeader(value: string | null) {
  const match = /^desktop\/(\d{1,4}(?:\.\d{1,5}){0,2})$/.exec(value || '');
  return match ? match[1] : null;
}

export function requireSupportedClient(request: Request) {
  const version = parseClientHeader(request.headers.get('x-typearchy-client'));
  if (version && compareVersions(version, MINIMUM_DESKTOP_CLIENT) < 0)
    throw new ClientError('Update Typearchy to keep using online features: close it, run git pull in its folder, then bin/typearchy-install.', 426);
  return version;
}
