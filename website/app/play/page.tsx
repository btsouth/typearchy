import type { Metadata } from 'next';
import ChallengeNav from '../challenges/ChallengeNav';
import TypearchyGame from '../TypearchyGame';

export const metadata: Metadata = {
  title: 'Play Typearchy',
  description: 'Play all seven Typearchy modes in the browser with local history and live themes.',
};

export default async function PlayPage({ searchParams }: { searchParams: Promise<{ challenge?: string }> }) {
  const { challenge = '' } = await searchParams;
  return (
    <main className="play-page">
      <ChallengeNav />
      <section className="play-shell">
        <header><div><p className="section-tag">TYPEARCHY WEB</p><h1>KEEP YOUR FINGERS SHARP.</h1></div><p>Words, prose, and code. Your pace, your practice.</p></header>
        <TypearchyGame initialChallengeKey={challenge} />
      </section>
    </main>
  );
}
