import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ShareActions from './ShareActions';

const demoRuns = {
  '7K2M9Q': {
    label: 'DAILY #241', wpm: 94, accuracy: 98, consistency: 92, errors: 3, delta: '+3',
    pace: [24, 37, 46, 58, 64, 78, 70, 92, 84, 100, 89, 94], paceText: '▁▂▄▅▆▇▆█',
  },
  'F4S8RP': {
    label: 'SPRINT / 30 SEC', wpm: 104, accuracy: 97, consistency: 90, errors: 5, delta: 'PB',
    pace: [46, 55, 67, 74, 82, 78, 88, 94, 91, 100, 96, 98], paceText: '▂▃▄▅▆▆▇█',
  },
  'C8D3VX': {
    label: 'CODE / RUST', wpm: 79, accuracy: 99, consistency: 95, errors: 2, delta: '+5',
    pace: [36, 44, 51, 48, 60, 67, 63, 72, 78, 74, 88, 84], paceText: '▁▂▃▃▄▅▆▇',
  },
} as const;

type DemoSlug = keyof typeof demoRuns;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const run = demoRuns[slug as DemoSlug];
  if (!run) return {};

  const title = `${run.wpm} WPM Typearchy run preview`;
  const description = 'A seeded preview of a Typearchy result page. Public run publishing is not connected yet.';
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, url: `https://typearchy.com/r/${slug}`, images: [] },
    twitter: { card: 'summary', title, description, images: [] },
  };
}

export default async function ResultPage({ params }: PageProps) {
  const { slug } = await params;
  const run = demoRuns[slug as DemoSlug];
  if (!run) notFound();

  return (
    <main className="receipt-page">
      <nav className="receipt-nav">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="wordmark" href="/" aria-label="Typearchy home"><span className="mark">T</span><span>TYPEARCHY</span></a>
        <span>DEMO RUN / SCORE RECEIPT</span>
      </nav>

      <section className="receipt-hero">
        <div className="receipt-intro">
          <p className="section-tag">{run.label} / SEEDED PREVIEW</p>
          <h1>RUN<br />RECEIPT.</h1>
          <p>This demonstrates the planned public result page. The app does not create public run URLs yet.</p>
          <ShareActions accuracy={run.accuracy} label={run.label} paceText={run.paceText} slug={slug} wpm={run.wpm} />
          <small>NO ACCOUNT REQUIRED / NO KEYSTROKES SHARED</small>
        </div>

        <div className="receipt-card" aria-label={`Shared Typearchy result: ${run.wpm} words per minute at ${run.accuracy} percent accuracy`}>
          <div className="receipt-card-head"><strong>TYPEARCHY</strong><span>{run.label}</span></div>
          <div className="receipt-score"><b>{run.wpm}</b><span>WPM</span></div>
          <div className="receipt-metrics"><span><small>ACCURACY</small>{run.accuracy}%</span><span><small>CONSISTENCY</small>{run.consistency}%</span><span><small>ERRORS</small>{run.errors}</span><span><small>PB DELTA</small>{run.delta}</span></div>
          <div className="receipt-pace"><div className="receipt-pace-head"><span>WPM OVER TIME</span><b>FINISH {run.wpm}</b></div><div>{run.pace.map((value, index) => <i key={index} style={{ height: `${value}%` }} />)}</div></div>
          <div className="receipt-card-foot"><span>KEEP YOUR FINGERS SHARP.</span><span>TYPEARCHY.COM/R/{slug}</span></div>
        </div>
      </section>

      <section className="receipt-contract" aria-label="Typearchy sharing contract">
        <span><b>01</b><small>SEEDED DEMO URL</small></span>
        <span><b>02</b><small>RESULT CARD PREVIEW</small></span>
        <span><b>03</b><small>WEB CLIENT AVAILABLE</small></span>
        <span><b>00</b><small>TYPED TEXT UPLOADED</small></span>
      </section>
    </main>
  );
}
