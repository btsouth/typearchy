import ChallengeNav from '../challenges/ChallengeNav';
import BrowserAccount from './BrowserAccount';

export const metadata = { title: 'Your profile | Typearchy', robots: { index: false }, alternates: { canonical: '/account' } };
export default function AccountPage() {
  return <main className="competition-page"><ChallengeNav /><section className="challenge-shell account-shell"><BrowserAccount /></section></main>;
}
