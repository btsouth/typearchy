import { ImageResponse } from 'next/og';
import { profileRuns, publicProfile } from '../../../lib/db';
import { profileSummary } from '../../../lib/profileContract';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ handle: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { handle } = await context.params;
  if (!/^[a-z0-9](?:[a-z0-9_-]{1,18}[a-z0-9])$/i.test(handle) || handle.toLowerCase() === 'demo')
    return new Response('Not found', { status: 404 });
  const profile = await publicProfile(handle).catch(() => null);
  if (!profile) return new Response('Not found', { status: 404 });
  const runs = await profileRuns(profile.id, 50).catch(() => []);
  const summary = profileSummary(runs);
  const player = `@${profile.handle}`;
  const best = `${summary.best || '-'} WPM`;
  const average = `${summary.averageAccuracy || '-'}%`;
  const pinned = `${summary.pinned}`;
  const footer = `TYPEARCHY.COM/U/${profile.handle.toUpperCase()}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: 64, background: '#0b1511', color: '#d7d7ad',
          fontFamily: 'monospace', position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, background: '#56a47b', display: 'flex' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#56a47b', color: '#0b1511', fontSize: 30, fontWeight: 700 }}>T</div>
          <div style={{ fontSize: 26, letterSpacing: 6, color: '#d7d7ad' }}>TYPEARCHY</div>
          <div style={{ fontSize: 22, color: '#7e8d7e', letterSpacing: 3 }}>PUBLIC PROFILE</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 30, color: '#7e8d7e', letterSpacing: 4 }}>TYPEARCHY PLAYER</div>
          <div style={{ fontSize: 130, fontWeight: 700, lineHeight: 1.1, color: '#d7d7ad' }}>{player}</div>
          <div style={{ display: 'flex', gap: 64, marginTop: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 22, color: '#7e8d7e', letterSpacing: 3 }}>BEST</div>
              <div style={{ fontSize: 64, color: '#56a47b' }}>{best}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 22, color: '#7e8d7e', letterSpacing: 3 }}>AVG ACCURACY</div>
              <div style={{ fontSize: 64, color: '#d7d7ad' }}>{average}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 22, color: '#7e8d7e', letterSpacing: 3 }}>PINNED RUNS</div>
              <div style={{ fontSize: 64, color: '#d7d7ad' }}>{pinned}</div>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 24, color: '#7e8d7e', letterSpacing: 3 }}>{footer}</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
