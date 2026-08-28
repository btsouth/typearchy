import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { runBySlug } from '../../lib/db';
import ShareActions from './ShareActions';

const demoRuns = {
  '7K2M9Q': { label: 'DAILY #241', mode: 'daily', target: '#241', duration: 74, challengeKey: 'daily:241', wpm: 94, rawWpm: 98, accuracy: 98, consistency: 92, errors: 3, pace: [58,66,74,82,88,94], handle: 'demo' },
  'F4S8RP': { label: 'SPRINT / 30 SEC', mode: 'sprint', target: 'prose / 30 seconds', duration: 30, challengeKey: 'sprint:prose:30:generated:prose:demo', wpm: 104, rawWpm: 109, accuracy: 97, consistency: 90, errors: 5, pace: [88,96,102,108,112,106,110,116,108,112,104,104], handle: 'demo' },
  'C8D3VX': { label: 'CODE / RUST', mode: 'code', target: 'rust / 30 seconds', duration: 30, challengeKey: 'code:rust:30:generated:code:rust:demo', wpm: 79, rawWpm: 81, accuracy: 99, consistency: 95, errors: 2, pace: [52,61,68,73,76,79], handle: 'demo' },
} as const;

type PageProps = { params: Promise<{ slug: string }> };

async function loadRun(slug: string) {
  const demo = demoRuns[slug as keyof typeof demoRuns];
  if (demo) return { ...demo, slug, demo: true };
  const row = await runBySlug(slug);
  if (!row) return null;
  let pace: number[] = [];
  try { pace = JSON.parse(row.pace_json); } catch { pace = [row.wpm]; }
  return { slug, demo: false, label: `${row.mode.toUpperCase()} / ${row.target.toUpperCase()}`, mode: row.mode, target: row.target, duration: row.duration, challengeKey: row.challenge_key, wpm: row.wpm, rawWpm: row.raw_wpm, accuracy: row.accuracy, consistency: row.consistency, errors: row.errors, pace, handle: row.handle || '' };
}

function paceText(values: number[]) {
  const bars = '▁▂▃▄▅▆▇█'; const minimum = Math.min(...values); const maximum = Math.max(...values); const range = Math.max(1, maximum - minimum);
  return values.map((value) => bars[Math.min(7, Math.floor((value - minimum) / range * 7))]).join('');
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params; const run = await loadRun(slug); if (!run) return {};
  const title = `${Math.round(run.wpm)} WPM ${run.mode} run by @${run.handle}`;
  const description = `${run.label} at ${run.accuracy}% accuracy. Challenge this Typearchy run.`;
  return { title, description, robots: run.demo ? { index: false, follow: true } : undefined, openGraph: { title, description, url: `https://typearchy.com/r/${slug}`, images: [] }, twitter: { card: 'summary', title, description, images: [] } };
}

export default async function ResultPage({ params }: PageProps) {
  const { slug } = await params; const run = await loadRun(slug); if (!run) notFound();
  const maximum = Math.max(1, ...run.pace); const replay = paceText(run.pace);
  return <main className="receipt-page">
    <nav className="receipt-nav"><Link className="wordmark" href="/" aria-label="Typearchy home"><span className="mark">T</span><span>TYPEARCHY</span></Link><span>{run.demo ? 'EXAMPLE RUN' : 'PUBLIC RUN'} / SCORE RECEIPT</span></nav>
    <section className="receipt-hero"><div className="receipt-intro"><p className="section-tag">{run.label} / @{run.handle.toUpperCase()}</p><h1>RUN<br />RECEIPT.</h1><p>A self-reported Typearchy score with a reproducible challenge and decimated pace replay. No typed text or keystrokes were uploaded.</p><ShareActions accuracy={run.accuracy} challengeKey={run.challengeKey} demo={run.demo} label={run.label} paceText={replay} slug={slug} wpm={run.wpm} /><small>PUBLIC SCORE / NO TYPED TEXT / SELF-REPORTED CLIENT</small></div>
      <div className="receipt-card" aria-label={`${Math.round(run.wpm)} words per minute at ${run.accuracy} percent accuracy`}><div className="receipt-card-head"><strong>TYPEARCHY</strong><span>{run.label}</span></div><div className="receipt-score"><b>{Math.round(run.wpm)}</b><span>WPM</span></div><div className="receipt-metrics"><span><small>ACCURACY</small>{run.accuracy}%</span><span><small>RAW</small>{Math.round(run.rawWpm)}</span><span><small>CONSISTENCY</small>{run.consistency}%</span><span><small>ERRORS</small>{run.errors}</span></div><div className="receipt-pace"><div className="receipt-pace-head"><span>WPM OVER TIME</span><b>FINISH {Math.round(run.wpm)}</b></div><div>{run.pace.map((value, index) => <i key={index} style={{ height: `${Math.max(7, value / maximum * 100)}%` }} />)}</div></div><div className="receipt-card-foot"><span>@{run.handle.toUpperCase()}</span><span>TYPEARCHY.COM/R/{slug}</span></div></div></section>
    <section className="receipt-contract" aria-label="Typearchy sharing contract"><span><b>01</b><small>IMMUTABLE RESULT URL</small></span><span><b>02</b><small>REPRODUCIBLE CHALLENGE</small></span><span><b>{run.duration}</b><small>SECONDS RECORDED</small></span><span><b>00</b><small>TYPED TEXT UPLOADED</small></span></section>
  </main>;
}
