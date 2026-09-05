import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findAttempt } from '../../lib/attempts';
import ResultCard from '../../results/ResultCard';
import { decodeResultTheme, themeStyle } from '../../lib/resultTheme';
import ChallengeNav from '../../challenges/ChallengeNav';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const attempt = await findAttempt((await params).slug);
  if (!attempt) return { title: 'Result not found | Typearchy', robots: { index: false } };
  const title = `Beat @${attempt.handle}: ${(attempt.duration_ms / 1000).toFixed(2)}s | Typearchy`;
  const description = `${attempt.title}. ${attempt.wpm} WPM, ${attempt.accuracy}% accuracy. Race the same passage.`;
  return { title, description, alternates: { canonical: `/a/${attempt.slug}` },
    openGraph: { title, description, url: `https://typearchy.com/a/${attempt.slug}`, images: [`https://typearchy.com/og/attempt/${attempt.slug}`] },
    twitter: { card: 'summary_large_image', title, description, images: [`https://typearchy.com/og/attempt/${attempt.slug}`] } };
}

export default async function AttemptPage({ params }: { params: Promise<{ slug: string }> }) {
  const attempt = await findAttempt((await params).slug);
  if (!attempt) notFound();
  const theme = decodeResultTheme(attempt.theme_json);
  return <main className="result-page" style={themeStyle(theme)}><ChallengeNav /><ResultCard key={attempt.slug} result={{
    url: `https://typearchy.com/a/${attempt.slug}`, title: attempt.title, handle: attempt.handle,
    category: attempt.language, durationMs: attempt.duration_ms, wpm: attempt.wpm, rawWpm: attempt.raw_wpm,
    accuracy: attempt.accuracy, errors: attempt.errors, challengeUrl: `/c/${attempt.challenge_slug}?race=${attempt.slug}`,
    standingsUrl: `/c/${attempt.challenge_slug}`, passage: attempt.passage, progress: JSON.parse(attempt.progress_json),
    source: attempt.attribution, createdAt: attempt.created_at, theme, validated: true,
  }} /></main>;
}
