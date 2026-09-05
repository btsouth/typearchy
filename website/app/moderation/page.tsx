import type { Metadata } from 'next';
import ChallengeNav from '../challenges/ChallengeNav';
import ModerationQueue from './ModerationQueue';

export const metadata: Metadata = { title: 'Review queue | Typearchy', robots: { index: false, follow: false } };

export default function ModerationPage() {
  return <main className="competition-page"><ChallengeNav /><section className="challenge-shell">
    <header className="challenge-heading"><div><p className="challenge-kicker">Community passages</p><h1>Review queue</h1></div></header>
    <ModerationQueue />
  </section></main>;
}
