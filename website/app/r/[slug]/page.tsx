import type { Metadata } from 'next';
import ChallengeNav from '../../challenges/ChallengeNav';
import ResultCard from '../../results/ResultCard';
import { THEMES, themeStyle } from '../../lib/resultTheme';
import { notFound } from 'next/navigation';
import { loadRun } from './run';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params; const run = await loadRun(slug); if (!run) return {};
  const title = `${Math.round(run.wpm)} WPM ${run.mode} run by @${run.handle}`;
  const description = `${run.label} at ${run.accuracy}% accuracy. Challenge this Typearchy run.`;
  const card = `https://typearchy.com/og/r/${slug}`;
  const images = [{ url: card, width: 1200, height: 630, alt: title }];
  return { title, description, robots: run.demo ? { index: false, follow: true } : undefined, openGraph: { title, description, url: `https://typearchy.com/r/${slug}`, images }, twitter: { card: 'summary_large_image', title, description, images: [card] } };
}

export default async function ResultPage({ params }: PageProps) {
  const { slug } = await params; const run = await loadRun(slug); if (!run) notFound();
  const theme = run.theme || THEMES[0];
  return <main className="result-page" style={themeStyle(theme)}><ChallengeNav /><ResultCard key={run.slug} result={{
    url:`https://typearchy.com/r/${slug}`,title:run.label,handle:run.handle,category:run.demo ? 'Example practice run' : 'Practice',
    durationMs:run.duration*1000,wpm:run.wpm,rawWpm:run.rawWpm,accuracy:run.accuracy,errors:run.errors,consistency:run.consistency,
    challengeUrl:`/play?challenge=${encodeURIComponent(run.challengeKey)}`,pace:run.pace,theme,validated:false,
  }} /></main>;
}
