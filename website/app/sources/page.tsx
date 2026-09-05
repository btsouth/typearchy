import ChallengeNav from '../challenges/ChallengeNav';
import snippets from '../rubySnippets.json';

export const metadata = { title: 'Code sources | Typearchy', alternates: { canonical: '/sources' } };
export default function SourcesPage() {
  return <main className="competition-page"><ChallengeNav /><section className="challenge-shell"><header className="challenge-heading"><div><p className="challenge-kicker">READ THE REAL CODE</p><h1>From the source.</h1><p>Reviewed excerpts from Ruby on Rails. Every passage is pinned to a specific revision.</p></div></header>
    <div className="challenge-grid">{snippets.map(snippet => <article className="challenge-tile" key={snippet.id}><p className="challenge-kicker">RUBY ON RAILS / MIT</p><h2>{snippet.title}</h2><p>{snippet.author}</p><p className="competition-note">{snippet.note}</p><a href={snippet.sourceUrl} target="_blank" rel="noopener noreferrer">View original source ↗</a></article>)}</div>
    <p className="competition-note">Rails excerpts are used under the <a href="/licenses/rails.txt">Rails MIT license</a>. Attribution describes the source of the code, not sponsorship or endorsement of Typearchy.</p>
  </section></main>;
}
