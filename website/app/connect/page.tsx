import type { Metadata } from 'next';
import Link from 'next/link';
import ConnectForm from './ConnectForm';
import ExistingProfileLink from './ExistingProfileLink';

export const metadata: Metadata = { title: 'Connect Typearchy profile', description: 'Claim a public Typearchy handle for your Omarchy app.', robots: { index: false, follow: false } };
export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code = '' } = await searchParams;
  return <main className="connect-page"><nav className="profile-nav"><Link className="wordmark" href="/"><span className="mark">T</span><span>TYPEARCHY</span></Link><div><span className="status-dot" /><span>DEVICE CONNECTION / 15 MINUTES</span></div></nav><ExistingProfileLink code={code}><ConnectForm initialCode={code} /></ExistingProfileLink></main>;
}
