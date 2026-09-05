import type { Metadata } from 'next';
import Link from 'next/link';
import RecoverForm from './RecoverForm';
import BrowserAccount from '../account/BrowserAccount';
import ChallengeNav from '../challenges/ChallengeNav';

export const metadata: Metadata = { title: 'Recover Typearchy profile', robots: { index: false, follow: false } };
export default async function RecoverPage({ searchParams }: { searchParams: Promise<{ code?: string; token_hash?: string; label?: string }> }) {
  const values = await searchParams;
  if (!values.code && !values.token_hash) return <main className="competition-page"><ChallengeNav /><section className="challenge-shell"><BrowserAccount recovering /></section></main>;
  return <main className="connect-page"><nav className="profile-nav"><Link className="wordmark" href="/"><span className="mark">T</span><span>TYPEARCHY</span></Link><div><span className="status-dot" /><span>PROFILE RECOVERY</span></div></nav><RecoverForm code={values.code || ''} tokenHash={values.token_hash || ''} label={values.label || 'Recovered Omarchy device'} /></main>;
}
