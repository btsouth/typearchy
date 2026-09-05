import type { Metadata } from 'next';
import Link from 'next/link';
import ConnectForm from './ConnectForm';
import ExistingProfileLink from './ExistingProfileLink';
import BrowserAdopt from './BrowserAdopt';

export const metadata: Metadata = { title: 'Connect Typearchy profile', description: 'Claim a public Typearchy handle for your Omarchy app.', robots: { index: false, follow: false } };
export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ code?: string; browser?: string }> }) {
  const { code = '', browser = '' } = await searchParams;
  const browserCode = /^[A-HJ-NP-Z2-9]{8}$/.test(browser.toUpperCase()) ? browser.toUpperCase() : '';
  return <main className="connect-page"><nav className="profile-nav"><Link className="wordmark" href="/"><span className="mark">T</span><span>TYPEARCHY</span></Link><div><span className="status-dot" /><span>{browserCode ? 'BROWSER CONNECTION / 10 MINUTES' : 'DEVICE CONNECTION / 15 MINUTES'}</span></div></nav>
    {browserCode ? <BrowserAdopt code={browserCode} /> : <ExistingProfileLink code={code}><ConnectForm initialCode={code} /></ExistingProfileLink>}</main>;
}
