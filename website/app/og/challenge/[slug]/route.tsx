import { findChallenge } from '../../../lib/challenges';
import { competitionCard } from '../../CompetitionCard';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const challenge = await findChallenge((await params).slug);
  if (!challenge) return new Response('Not found', { status: 404 });
  return competitionCard({ title: challenge.title, handle: challenge.handle, language: challenge.language,
    metrics: 'Correct every mistake. Set a time for your friends.', path: `c/${challenge.slug}` });
}
