import ChallengeNav from '../ChallengeNav';
import ChallengeCreator from './ChallengeCreator';

export const metadata = { title: 'Create a challenge | Typearchy', robots: { index: false }, alternates: { canonical: '/challenges/new' } };
export default function NewChallengePage() {
  return <main className="competition-page"><ChallengeNav /><section className="challenge-shell"><header className="challenge-heading"><div><p className="challenge-kicker">GIVE THEM SOMETHING TO BEAT</p><h1>Your challenge.</h1><p>Publish a passage, then set the first time.</p></div></header><ChallengeCreator /></section></main>;
}
