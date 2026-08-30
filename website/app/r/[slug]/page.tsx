import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadRun } from './run';
import ShareActions from './ShareActions';

type PageProps = { params: Promise<{ slug: string }> };

function paceText(values: number[]) {
  const bars = '▁▂▃▄▅▆▇█'; const minimum = Math.min(...values); const maximum = Math.max(...values); const range = Math.max(1, maximum - minimum);
  return values.map((value) => bars[Math.min(7, Math.floor((value - minimum) / range * 7))]).join('');
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params; const run = await loadRun(slug); if (!run) return {};
  const title = `${Math.round(run.wpm)} WPM ${run.mode} run by @${run.handle}`;
  const description = `${run.label} at ${run.accuracy}% accuracy. Challenge this Typearchy run.`;
  const card = `https://typearchy.com/og/r/${slug}`;
  const images = [{ url: card, width: 1200, height: 630, alt: title }];
  return { title, description, robots: run.demo ? { index: false, follow: true } : undefined, openGraph: { title, description, url: `https://typearchy.com/r/${slug}`, images }, twitter: { card: 'summary_large_image', title, description, images: [card] } };
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
