import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, profileRuns, publicProfile, type RunRow } from '../../lib/db';
import { profileSummary } from '../../lib/profileContract';
import PinnedGhost from './PinnedGhost';
import ProfileActions from './ProfileActions';
import ReportChallenge from '../../c/[slug]/ReportChallenge';

type PageProps = { params: Promise<{ handle: string }> };

const demoRuns: RunRow[] = [
  { id: 'demo-1', slug: 'F4S8RP', profile_id: 'demo', schema_version: 1, content_version: '2026.08.2', mode: 'sprint', challenge_key: 'sprint:prose:30:generated:prose:demo', target: 'prose / 30 seconds', duration: 30, wpm: 104, raw_wpm: 109, accuracy: 97, consistency: 90, errors: 5, pace_json: '[88,96,102,108,112,106,110,116,108,112,104,104]', created_at: 1787961600, pinned_at: 1787961600 },
  { id: 'demo-2', slug: '7K2M9Q', profile_id: 'demo', schema_version: 1, content_version: '2026.08.2', mode: 'daily', challenge_key: 'daily:241', target: '#241', duration: 74, wpm: 94, raw_wpm: 98, accuracy: 98, consistency: 92, errors: 3, pace_json: '[58,66,74,82,88,94]', created_at: 1787875200, pinned_at: 1787875200 },
  { id: 'demo-3', slug: 'C8D3VX', profile_id: 'demo', schema_version: 1, content_version: '2026.08.2', mode: 'code', challenge_key: 'code:rust:30:generated:code:rust:demo', target: 'rust / 30 seconds', duration: 30, wpm: 79, raw_wpm: 81, accuracy: 99, consistency: 95, errors: 2, pace_json: '[52,61,68,73,76,79]', created_at: 1787788800, pinned_at: 1787788800 },
];

function displayRun(run: RunRow, handle: string) {
  let pace: number[] = [];
  try { pace = JSON.parse(run.pace_json); } catch { pace = [run.wpm]; }
  return {
    slug: run.slug, handle, mode: run.mode.toUpperCase(), target: run.target.toUpperCase(),
    wpm: run.wpm, accuracy: run.accuracy, consistency: run.consistency,
    duration: run.duration, pace: pace.length ? pace : [run.wpm],
    date: new Date(run.created_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).toUpperCase(),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  if (handle === 'demo') {
    const title = 'Typearchy public profile example';
    const description = 'A working example of selected public runs and a replayable pinned ghost.';
    return { title, description, robots: { index: false, follow: true }, openGraph: { title, description, images: ['/og.png'] }, twitter: { card: 'summary', title, description, images: ['/og.png'] } };
  }
  const profile = await publicProfile(handle);
  if (!profile) return {};
  const title = `@${profile.handle} on Typearchy`;
  const description = `Selected typing runs and personal bests from @${profile.handle}.`;
  const card = `https://typearchy.com/og/u/${profile.handle}`;
  const images = [{ url: card, width: 1200, height: 630, alt: title }];
  return { title, description, openGraph: { title, description, url: `https://typearchy.com/u/${profile.handle}`, images }, twitter: { card: 'summary_large_image', title, description, images: [card] } };
}

export default async function ProfilePage({ params }: PageProps) {
  const { handle: requestedHandle } = await params;
  const demo = requestedHandle === 'demo';
  const profile = demo ? { id: 'demo', handle: 'demo' } : await publicProfile(requestedHandle);
  if (!profile) notFound();
  const [challenges, attempts] = demo ? [[], []] : await Promise.all([
    db().prepare(`SELECT slug, title, language FROM challenges WHERE creator_id = ? AND visibility = 'public' AND moderation = 'approved' ORDER BY created_at DESC LIMIT 12`).bind(profile.id).all<{ slug: string; title: string; language: string }>().then(result => result.results),
    db().prepare(`SELECT a.slug, a.duration_ms, a.wpm, c.title FROM challenge_attempts a
      JOIN challenges c ON c.id = a.challenge_id JOIN profiles creator ON creator.id = c.creator_id
      WHERE a.profile_id = ? AND a.published = 1 AND c.visibility = 'public' AND c.moderation = 'approved' AND creator.visibility = 'public'
      ORDER BY a.created_at DESC LIMIT 12`).bind(profile.id).all<{ slug: string; duration_ms: number; wpm: number; title: string }>().then(result => result.results),
  ]);
  const runs = demo ? demoRuns : await profileRuns(profile.id, 50);
  const summary = profileSummary(runs);
  const pinned = runs.filter((run) => run.pinned_at != null).sort((left, right) => Number(right.pinned_at) - Number(left.pinned_at)).slice(0, 3);
  const primary = pinned[0] ? displayRun(pinned[0], profile.handle) : null;

  return (
    <main className="profile-page profile-page-compact">
      <nav className="profile-nav"><Link className="wordmark" href="/" aria-label="Typearchy home"><span className="mark">T</span><span>TYPEARCHY</span></Link><div><span className="status-dot" /><span>{demo ? 'PROFILE EXAMPLE / SEEDED RUNS' : 'PUBLIC PROFILE / SELECTED RUNS'}</span></div></nav>
      <header className="profile-compact-head">
        <div className="profile-compact-id"><div className="profile-avatar" aria-hidden="true"><span>{profile.handle[0].toUpperCase()}</span></div><div><p className="profile-kicker">TYPEARCHY PLAYER</p><h1>@{profile.handle}</h1><p>{pinned.length ? `${pinned.length} selected ${pinned.length === 1 ? 'run' : 'runs'}. Local history stays local.` : 'No pinned runs yet.'}</p></div></div>
        <ProfileActions handle={profile.handle} primarySlug={primary?.slug} />
      </header>
      <section className="profile-compact-stats" aria-label="Public profile summary">
        <span><small>BEST</small><b>{summary.best || '-'}</b><em>WPM</em></span><span><small>AVG ACC</small><b>{summary.averageAccuracy || '-'}</b><em>PERCENT</em></span><span><small>CODE</small><b>{summary.codeBest || '-'}</b><em>WPM</em></span><span><small>PINNED</small><b>{summary.pinned}</b><em>RUNS</em></span>
      </section>
      {(challenges.length > 0 || attempts.length > 0) && <section className="profile-pins competition-page">
        {challenges.length > 0 && <><h2>Challenges by @{profile.handle}</h2><div className="challenge-grid">{challenges.map(challenge => <a className="challenge-tile" key={challenge.slug} href={`/c/${challenge.slug}`}><p className="challenge-kicker">{challenge.language}</p><h3>{challenge.title}</h3><p>Race this passage ↗</p></a>)}</div></>}
        {attempts.length > 0 && <><h2>Times to beat</h2><div className="challenge-grid">{attempts.map(attempt => <a className="challenge-tile" key={attempt.slug} href={`/a/${attempt.slug}`}><p className="challenge-kicker">{(attempt.duration_ms / 1000).toFixed(2)}s · {attempt.wpm} WPM</p><h3>{attempt.title}</h3><p>Race @{profile.handle} ↗</p></a>)}</div></>}
      </section>}
      <section className="profile-pins">
        <div className="profile-pins-head"><div><p className="section-tag">PINNED RUNS</p><h2>Selected practice runs.</h2></div><p>These practice runs were selected by the player. Challenge input is sent for score validation; public replays contain only progress and timing.</p></div>
        {primary ? <PinnedGhost run={primary} /> : <div className="profile-empty"><b>NO PINS YET</b><span>Published runs can be pinned from Typearchy history.</span></div>}
        {pinned.length > 1 && <div className="profile-run-grid">{pinned.slice(1).map((run) => {
          const shown = displayRun(run, profile.handle); const maximum = Math.max(...shown.pace);
          return <article className="profile-run-card" key={shown.slug}><div className="profile-run-meta"><span>{shown.mode} / {shown.target}</span><small>{shown.date}</small></div><div className="profile-run-score"><b>{Math.round(shown.wpm)}</b><span>WPM</span></div><div className="profile-run-metrics"><span><small>ACC</small>{shown.accuracy}%</span><span><small>CONSISTENCY</small>{shown.consistency}%</span></div><div className="profile-run-pace" aria-label={`${shown.mode} pace over time`}>{shown.pace.map((value, index) => <i key={`${value}-${index}`} style={{ height: `${Math.max(12, value / maximum * 100)}%` }} />)}</div><a href={`/r/${shown.slug}`}>CHALLENGE RUN <span>→</span></a></article>;
        })}</div>}
      </section>
      {!demo && <ReportChallenge profile={profile.handle} />}
      <footer className="profile-footer"><Link className="wordmark" href="/"><span className="mark">T</span><span>TYPEARCHY</span></Link><p>TYPEARCHY.COM/U/{profile.handle.toUpperCase()}</p><span>{demo ? 'EXAMPLE' : 'PUBLIC'} / {pinned.length} PINS</span></footer>
    </main>
  );
}
