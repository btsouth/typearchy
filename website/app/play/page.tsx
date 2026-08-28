import type { Metadata } from 'next';
import TypearchyGame from '../TypearchyGame';

export const metadata: Metadata = {
  title: 'Play Typearchy',
  description: 'Play all seven Typearchy modes in the browser with local history and live themes.',
};

export default async function PlayPage({ searchParams }: { searchParams: Promise<{ challenge?: string }> }) {
  const { challenge = '' } = await searchParams;
  return (
    <main className="play-page">
      <nav className="play-nav">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="wordmark" href="/" aria-label="Typearchy home"><span className="mark">T</span><span>TYPEARCHY</span></a>
        <div><span className="status-dot" /><span>WEB CLIENT / LOCAL SESSION</span></div>
      </nav>
      <section className="play-shell">
        <header><div><p className="section-tag">TYPEARCHY WEB</p><h1>KEEP YOUR FINGERS SHARP.</h1></div><p>Seven modes. Six themes. Local browser history.</p></header>
        <TypearchyGame initialChallengeKey={challenge} />
      </section>
    </main>
  );
}
