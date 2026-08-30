import { ImageResponse } from 'next/og';
import { loadRun } from '../../../r/[slug]/run';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  if (!/^[A-HJ-NP-Z2-9]{6,8}$/.test(slug)) return new Response('Not found', { status: 404 });
  const run = await loadRun(slug).catch(() => null);
  if (!run) return new Response('Not found', { status: 404 });
  const maximum = Math.max(1, ...run.pace);
  const bars = run.pace.slice(0, 40);
  const metrics = `${Math.round(run.accuracy)}% ACC / ${Math.round(run.consistency)}% CONS / ${run.errors} ERR`;
  const footer = `TYPEARCHY.COM/R/${slug}`;
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#56a47b', color: '#0b1511', fontSize: 30, fontWeight: 700 }}>T</div>
            <div style={{ fontSize: 26, letterSpacing: 6, color: '#d7d7ad' }}>TYPEARCHY</div>
          </div>
          <div style={{ fontSize: 22, letterSpacing: 3, color: '#7e8d7e' }}>{run.label}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
              <div style={{ fontSize: 220, lineHeight: 1, fontWeight: 700, color: '#d7d7ad' }}>{String(Math.round(run.wpm))}</div>
              <div style={{ fontSize: 44, color: '#56a47b', letterSpacing: 4, paddingBottom: 28 }}>WPM</div>
            </div>
            <div style={{ fontSize: 30, color: '#7e8d7e', marginTop: 24 }}>{metrics}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 200, width: 420 }}>
            {bars.map((value, index) => (
              <div key={index} style={{ flex: 1, height: `${Math.max(6, (value / maximum) * 100)}%`, background: '#56a47b', opacity: 0.75, display: 'flex' }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: '#7e8d7e', letterSpacing: 3 }}>
          <div>{`@${run.handle.toUpperCase()}`}</div>
          <div>{footer}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
