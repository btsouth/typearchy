import { decodeResultTheme } from '../../../lib/resultTheme';
import { findAttempt } from '../../../lib/attempts';
import { competitionCard } from '../../CompetitionCard';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const attempt = await findAttempt((await params).slug);
  if (!attempt) return new Response('Not found', { status: 404 });
  return competitionCard({ title: attempt.title, handle: attempt.handle, language: attempt.language, time: attempt.duration_ms, theme: decodeResultTheme(attempt.theme_json),
    metrics: `${attempt.wpm} WPM · ${attempt.accuracy}% accuracy`, path: `a/${attempt.slug}` });
}
