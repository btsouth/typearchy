import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PinnedGhost from './PinnedGhost';
import ProfileActions from './ProfileActions';

const profileHandle = 'bts';

const benchmarks = [
  { mode: 'SPRINT', target: '15 SEC', wpm: 112, accuracy: '98%', note: 'PERSONAL BEST' },
  { mode: 'SPRINT', target: '30 SEC', wpm: 104, accuracy: '97%', note: 'PERSONAL BEST' },
  { mode: 'SPRINT', target: '60 SEC', wpm: 96, accuracy: '98%', note: 'PERSONAL BEST' },
  { mode: 'DAILY', target: 'BEST', wpm: 94, accuracy: '98%', note: 'TOP 18%' },
  { mode: 'SHELL', target: 'COMMANDS', wpm: 82, accuracy: '97%', note: '43 COMMANDS' },
  { mode: 'CODE', target: 'ALL LANGS', wpm: 79, accuracy: '99%', note: 'CLEANEST' },
];

const publicRuns = [
  { date: 'AUG 28', mode: 'DAILY #241', wpm: 94, accuracy: '98%', consistency: '92%', slug: '7K2M9Q', signal: '+3 PB' },
  { date: 'AUG 27', mode: 'SPRINT / 30', wpm: 104, accuracy: '97%', consistency: '90%', slug: 'F4S8RP', signal: 'PB' },
  { date: 'AUG 26', mode: 'CODE / RUST', wpm: 79, accuracy: '99%', consistency: '95%', slug: 'C8D3VX', signal: '+5' },
];

const progression = [72, 76, 74, 81, 79, 85, 83, 88, 91, 89, 94, 92, 99, 96, 104];

type PageProps = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  if (handle !== profileHandle) return {};

  const title = '@bts types 112 WPM on Typearchy';
  const description = 'Public Typearchy profile: personal bests, progress, and selected runs. Challenge the score and keep your fingers sharp.';
  return {
    title,
    description,
    openGraph: { title, description, url: `https://typearchy.com/u/${profileHandle}`, images: [] },
    twitter: { card: 'summary', title, description, images: [] },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { handle } = await params;
  if (handle !== profileHandle) notFound();

  const chartWidth = 760;
  const chartHeight = 180;
  const min = 68;
  const max = 108;
  const points = progression.map((value, index) => {
    const x = (index / (progression.length - 1)) * chartWidth;
    const y = chartHeight - ((value - min) / (max - min)) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <main className="profile-page">
      <nav className="profile-nav">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="wordmark" href="/" aria-label="Typearchy home"><span className="mark">T</span><span>TYPEARCHY</span></a>
        <div><span className="status-dot" /><span>PUBLIC PROFILE</span></div>
      </nav>

      <header className="profile-hero">
        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden="true"><span>B</span><i /></div>
          <div>
            <p className="profile-kicker">TYPEARCHY PLAYER / OSAKA JADE</p>
            <h1>@bts</h1>
            <p>Keeping the hands sharp between agents, terminals, and unfinished ideas.</p>
            <div className="profile-proof"><span>GITHUB CONNECTED</span><span>MEMBER SINCE AUG 2026</span><span>LOUISVILLE, KY</span></div>
            <ProfileActions handle={profileHandle} />
          </div>
        </div>
        <div className="profile-headline-stat">
          <span>ALL-TIME BEST</span>
          <div><b>112</b><small>WPM</small></div>
          <p>SPRINT / 15 SEC&nbsp;&nbsp;·&nbsp;&nbsp;98% ACCURACY</p>
        </div>
      </header>

      <section className="profile-signal" aria-label="Profile summary">
        <span><small>LAST 10 AVG</small><b>94</b> WPM</span>
        <span><small>AVG ACCURACY</small><b>97.4</b>%</span>
        <span><small>AVG CONSISTENCY</small><b>91</b>%</span>
        <span><small>CURRENT STREAK</small><b>12</b> DAYS</span>
        <span><small>PUBLIC RUNS</small><b>43</b> SELECTED</span>
      </section>

      <PinnedGhost />

      <section className="profile-section profile-benchmarks">
        <div className="profile-section-head">
          <div><p className="section-tag">02 / SPEED RÉSUMÉ</p><h2>Comparable tests.<br />No mystery number.</h2></div>
          <p>Personal bests are grouped by mode and test length, so a quick sprint never pretends to be a sixty-second score.</p>
        </div>
        <div className="benchmark-grid">
          {benchmarks.map((benchmark) => (
            <article key={`${benchmark.mode}-${benchmark.target}`}>
              <div><span>{benchmark.mode}</span><small>{benchmark.target}</small></div>
              <strong>{benchmark.wpm}</strong>
              <div><span>{benchmark.accuracy} ACC</span><small>{benchmark.note}</small></div>
            </article>
          ))}
        </div>
      </section>

      <section className="profile-section profile-progress">
        <div className="profile-section-head">
          <div><p className="section-tag">03 / 30 DAY FORM</p><h2>The direction matters.</h2></div>
          <p>A rolling view of comparable Sprint 30 runs. Hover-free, readable, and honest about the test behind the line.</p>
        </div>
        <div className="profile-chart">
          <div className="profile-chart-head"><span>SPRINT / 30 SEC / MEDIAN WPM</span><b>+17.8% THIS MONTH</b></div>
          <div className="profile-chart-plot">
            <div className="chart-axis"><span>108</span><span>88</span><span>68</span></div>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Sprint 30 second median speed increased from 72 to 104 words per minute across fifteen sessions">
              <defs><linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity=".28" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
              <polygon points={`0,${chartHeight} ${points} ${chartWidth},${chartHeight}`} fill="url(#profile-fill)" />
              <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              {progression.map((value, index) => {
                const x = (index / (progression.length - 1)) * chartWidth;
                const y = chartHeight - ((value - min) / (max - min)) * chartHeight;
                return <circle key={`${value}-${index}`} cx={x} cy={y} r={index === progression.length - 1 ? 6 : 3} fill={index === progression.length - 1 ? 'var(--ink)' : 'var(--accent)'} />;
              })}
            </svg>
          </div>
          <div className="profile-chart-foot"><span>JUL 30</span><span>15 COMPARABLE SESSIONS</span><span>AUG 28</span></div>
        </div>
      </section>

      <section className="profile-section profile-public-runs">
        <div className="profile-section-head">
          <div><p className="section-tag">04 / SELECTED RUNS</p><h2>Proof you can challenge.</h2></div>
          <p>Only runs this player chose to publish appear here. Each score opens as an immutable receipt with the same reproducible challenge.</p>
        </div>
        <div className="public-run-table">
          <div className="public-run-row public-run-labels"><span>DATE</span><span>TEST</span><span>WPM</span><span>ACC</span><span>CONSISTENCY</span><span>SIGNAL</span><span>ACTION</span></div>
          {publicRuns.map((run) => (
            <div className="public-run-row" key={run.slug}>
              <span>{run.date}</span><strong>{run.mode}</strong><b>{run.wpm}</b><span>{run.accuracy}</span><span>{run.consistency}</span><i>{run.signal}</i>
              <a href={`/r/${run.slug}`} aria-label={`Open and challenge the ${run.mode} run at ${run.wpm} words per minute`}>CHALLENGE →</a>
            </div>
          ))}
        </div>
      </section>

      <section className="profile-contract">
        <div><p className="section-tag">05 / PROFILE CONTRACT</p><h2>Public by choice.<br />Local by default.</h2></div>
        <div className="profile-contract-grid">
          <span><b>VISIBLE</b><small>HANDLE / SELECTED SCORES / PUBLIC STATS</small></span>
          <span><b>PRIVATE</b><small>EMAIL / TYPED TEXT / KEYSTROKES / LOCAL HISTORY</small></span>
          <span><b>CONTROL</b><small>HIDE ANY RUN / DISCONNECT ANY DEVICE / DELETE PROFILE</small></span>
          <span><b>STATUS</b><small>RECORDED BY TYPEARCHY / SELF-REPORTED CLIENT</small></span>
        </div>
      </section>

      <footer className="profile-footer">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="wordmark" href="/"><span className="mark">T</span><span>TYPEARCHY</span></a>
        <p>TYPEARCHY.COM/U/BTS</p><span>KEEP YOUR FINGERS SHARP.</span>
      </footer>
    </main>
  );
}
