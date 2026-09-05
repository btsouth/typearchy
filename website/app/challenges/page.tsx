import type { Metadata } from 'next';
import { db } from '../lib/db';
import { CHALLENGE_LANGUAGES } from '../lib/challengeContract';
import { listedSql } from '../lib/challenges';
import ChallengeNav from './ChallengeNav';
import ChallengeFilters from './ChallengeFilters';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Challenges | Typearchy', alternates: { canonical: '/challenges' } };

type Query = { q?: string; language?: string; after?: string };
export default async function ChallengesPage({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams;
  const search = typeof query.q === 'string' ? query.q.trim().slice(0, 80) : '';
  const language = CHALLENGE_LANGUAGES.find(value => value === query.language) || '';
  const cursor = typeof query.after === 'string' ? /^(\d{1,16})\.([a-z0-9]{12})$/.exec(query.after) : null;
  const like = '%' + search.replace(/[\\%_]/g, value => '\\' + value) + '%';
  const rows = await db().prepare(`SELECT c.slug, c.title, c.language, c.passage, c.created_at, p.handle,
    (SELECT COUNT(DISTINCT a.profile_id) FROM challenge_attempts a JOIN profiles ap ON ap.id = a.profile_id
      WHERE a.challenge_id = c.id AND a.published = 1 AND ap.visibility = 'public') AS players
    FROM challenges c JOIN profiles p ON p.id = c.creator_id
    WHERE ${listedSql()}
      AND (? = '' OR c.language = ?)
      AND (? = '' OR c.title LIKE ? ESCAPE '\\' OR p.handle LIKE ? ESCAPE '\\')
      AND (? = 0 OR c.created_at < ? OR (c.created_at = ? AND c.slug < ?))
    ORDER BY c.created_at DESC, c.slug DESC LIMIT 41`)
    .bind(language, language, search, like, like, cursor ? 1 : 0, Number(cursor?.[1] || 0), Number(cursor?.[1] || 0), cursor?.[2] || '')
    .all<{ slug: string; title: string; language: string; passage: string; handle: string; players: number; created_at: number }>();
  const entries = rows.results.slice(0, 40);
  const next = new URLSearchParams();
  if (search) next.set('q', search);
  if (language) next.set('language', language);
  if (entries.length) next.set('after', `${entries.at(-1)!.created_at}.${entries.at(-1)!.slug}`);
  return <main className="competition-page"><ChallengeNav /><section className="challenge-shell">
    <header className="challenge-heading"><div><p className="challenge-kicker">SAME PASSAGE. YOUR BEST RUN.</p><h1>Challenges</h1><p>Choose a challenge. Race its creator. Set a time worth chasing.</p></div><a className="competition-button primary" href="/challenges/new">Create a challenge</a></header>
    <ChallengeFilters search={search} language={language} hasCursor={!!cursor} />
    {entries.length ? <div className="challenge-grid">{entries.map(row => <a className="challenge-tile" href={`/c/${row.slug}`} key={row.slug}>
      <span className="challenge-kicker">{row.language} <span>by @{row.handle}</span></span><h2>{row.title}</h2>
      <pre>{row.passage.slice(0, 160)}</pre><p className="competition-note">{Array.from(row.passage).length} characters · {row.passage.split('\n').length} {row.passage.includes('\n') ? 'lines' : 'line'}</p><footer><span>{row.players} {row.players === 1 ? 'player' : 'players'}</span><strong>Take the challenge ↗</strong></footer>
    </a>)}</div> : <div className="competition-empty"><h2>{search || language || cursor ? 'No matching challenges.' : 'The first challenge is yours.'}</h2><p>{search || language || cursor ? 'Try another title, player, or language.' : 'Pick a passage, post your time, and invite someone to beat it.'}</p><a href={search || language || cursor ? '/challenges' : '/challenges/new'}>{search || language || cursor ? 'Browse all challenges ↗' : 'Create a challenge ↗'}</a></div>}
    {rows.results.length > 40 && <p className="competition-actions"><a className="competition-button" href={`/challenges?${next}`}>More challenges ↗</a></p>}
  </section></main>;
}
