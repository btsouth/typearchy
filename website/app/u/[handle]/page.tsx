import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PinnedGhost from './PinnedGhost';
import ProfileActions from './ProfileActions';

const profileHandle = 'bts';

const pinnedRuns = [
  { slug: '7K2M9Q', mode: 'DAILY', target: '#241', wpm: 94, accuracy: 98, consistency: 92, date: 'AUG 28', pace: [58, 66, 74, 82, 88, 94] },
  { slug: 'C8D3VX', mode: 'CODE', target: 'RUST', wpm: 79, accuracy: 99, consistency: 95, date: 'AUG 26', pace: [52, 61, 68, 73, 76, 79] },
];

type PageProps = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  if (handle !== profileHandle) return {};
  const title = '@bts profile preview on Typearchy';
  const description = 'A preview of selected typing runs, comparable personal bests, and a pinned ghost to challenge.';
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, url: `https://typearchy.com/u/${profileHandle}`, images: [] },
    twitter: { card: 'summary', title, description, images: [] },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { handle } = await params;
  if (handle !== profileHandle) notFound();

  return (
    <main className="profile-page profile-page-compact">
      <nav className="profile-nav">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="wordmark" href="/" aria-label="Typearchy home"><span className="mark">T</span><span>TYPEARCHY</span></a>
        <div><span className="status-dot" /><span>PROFILE PREVIEW / SEEDED RUNS</span></div>
      </nav>

      <header className="profile-compact-head">
        <div className="profile-compact-id">
          <div className="profile-avatar" aria-hidden="true"><span>B</span></div>
          <div>
            <p className="profile-kicker">TYPEARCHY PLAYER</p>
            <h1>@bts</h1>
            <p>Three selected runs. Local history stays local.</p>
          </div>
        </div>
        <ProfileActions handle={profileHandle} />
      </header>

      <section className="profile-compact-stats" aria-label="Public profile preview summary">
        <span><small>BEST</small><b>104</b><em>WPM / 30S</em></span>
        <span><small>AVG ACC</small><b>98</b><em>PERCENT</em></span>
        <span><small>CODE</small><b>79</b><em>WPM / RUST</em></span>
        <span><small>PINNED</small><b>3</b><em>RUNS</em></span>
      </section>

      <section className="profile-pins">
        <div className="profile-pins-head">
          <div><p className="section-tag">PINNED RUNS</p><h2>Proof, not a feed.</h2></div>
          <p>Profile publishing is not connected yet. The intended model is explicit publishing from the app, with a maximum of three pins.</p>
        </div>

        <PinnedGhost />

        <div className="profile-run-grid">
          {pinnedRuns.map((run) => {
            const maximum = Math.max(...run.pace);
            return (
              <article className="profile-run-card" key={run.slug}>
                <div className="profile-run-meta"><span>{run.mode} / {run.target}</span><small>{run.date}</small></div>
                <div className="profile-run-score"><b>{run.wpm}</b><span>WPM</span></div>
                <div className="profile-run-metrics"><span><small>ACC</small>{run.accuracy}%</span><span><small>CONSISTENCY</small>{run.consistency}%</span></div>
                <div className="profile-run-pace" aria-label={`${run.mode} pace over time`}>
                  {run.pace.map((value, index) => <i key={`${value}-${index}`} style={{ height: `${Math.max(12, value / maximum * 100)}%` }} />)}
                </div>
                <a href={`/r/${run.slug}`}>OPEN DEMO RUN <span>→</span></a>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="profile-footer">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="wordmark" href="/"><span className="mark">T</span><span>TYPEARCHY</span></a>
        <p>TYPEARCHY.COM/U/BTS</p><span>PREVIEW / 3 PINS</span>
      </footer>
    </main>
  );
}
