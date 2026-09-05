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
        <header><h1>Let’s type.</h1><p>A little practice, at your own pace.</p></header>
        <TypearchyGame initialChallengeKey={challenge} />
      </section>
    </main>
  );
}
