import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ChallengeNav from '../../challenges/ChallengeNav';
import { challengeGhost, challengeStandings, findChallenge, isListed, publicChallenge } from '../../lib/challenges';
import ChallengeRace from './ChallengeRace';
import ReportChallenge from './ReportChallenge';
import { currentViewer } from '../../lib/viewer';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const challenge = await findChallenge((await params).slug, (await currentViewer())?.profileId);
  if (!challenge) return { title: 'Challenge not found | Typearchy', robots: { index: false } };
  const title = `${challenge.title} by @${challenge.handle} | Typearchy`;
  const description = `Race this ${challenge.language} passage. Complete the same challenge and set your best time.`;
  return { title, description, alternates: { canonical: `/c/${challenge.slug}` },
    robots: { index: isListed(challenge) },
    openGraph: { title, description, url: `https://typearchy.com/c/${challenge.slug}`, images: [`https://typearchy.com/og/challenge/${challenge.slug}`] },
    twitter: { card: 'summary_large_image', title, description, images: [`https://typearchy.com/og/challenge/${challenge.slug}`] } };
}

export default async function ChallengePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ race?: string }> }) {
  const viewer = await currentViewer();
  const challenge = await findChallenge((await params).slug, viewer?.profileId);
  if (!challenge) notFound();
  const isCreator = viewer?.profileId === challenge.creator_id;
  const review = challenge.moderation === 'rejected' ? 'This passage was not approved for the public library. Only you can open it now, and any published results on it are no longer public.'
    : challenge.moderation === 'pending' ? isCreator
      ? challenge.visibility === 'public' ? 'Anyone with this link can race it now. It joins the public library after a moderator reviews it.' : 'Anyone with this link can race it now. It stays out of the public library.'
      : 'This passage was shared by its creator and has not been reviewed yet. Report it if it should not be here.'
    : '';
  const [standings, ghost] = await Promise.all([challengeStandings(challenge.id), challengeGhost(challenge.id, (await searchParams).race)]);
  return <main className="competition-page"><ChallengeNav /><section className="challenge-shell">
    <header className="challenge-heading"><div><p className="challenge-kicker">{challenge.language} <span>by <a href={`/u/${challenge.handle}`}>@{challenge.handle}</a></span></p><h1>{challenge.title}</h1></div><a href="/challenges" className="competition-back">All challenges ↗</a></header>
    {review && <p className="competition-review" role="status">{review}</p>}
    {isCreator && challenge.moderation !== 'approved' && challenge.review_note && <p className="competition-note">Review note: {challenge.review_note}</p>}
    <p className="competition-note"><a href={`typearchy://challenge/${challenge.slug}${ghost ? `?race=${ghost.slug}` : ''}`}>Open in Typearchy ↗</a></p>
    <ChallengeRace key={challenge.slug} challenge={publicChallenge(challenge)} ghost={ghost} guest={!viewer} />
    <section className="challenge-standings" aria-labelledby="standings-title"><header><h2 id="standings-title">Times to beat</h2><span>Best complete run per player</span></header>
      {standings.length ? <div className="standings-scroll"><table><thead><tr><th scope="col">Place</th><th scope="col">Player</th><th scope="col">Time</th><th scope="col">WPM</th><th scope="col">Accuracy</th><th scope="col"><span className="sr-only">Challenge</span></th></tr></thead><tbody>{standings.map((row, index) => <tr key={row.slug}><td>{index + 1}</td><th scope="row"><a href={`/u/${row.handle}`}>@{row.handle}</a>{row.handle === challenge.handle && <small>Creator</small>}</th><td>{(row.duration_ms / 1000).toFixed(2)}s</td><td>{row.wpm}</td><td>{row.accuracy}%</td><td><a href={`/c/${challenge.slug}?race=${row.slug}`}>Race ↗</a></td></tr>)}</tbody></table></div>
        : <div className="competition-empty"><h3>Set the first time.</h3><p>Finish the passage and publish your result to start the standings.</p></div>}
    </section>
    {!isCreator && <ReportChallenge slug={challenge.slug} />}
  </section></main>;
}
