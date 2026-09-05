import ChallengeNav from '../challenges/ChallengeNav';
import HistoryHub from './HistoryHub';
export const metadata = { title: 'History and progress | Typearchy', robots: {index:false}, alternates:{canonical:'/history'} };
export default async function HistoryPage({searchParams}:{searchParams:Promise<{view?:string}>}) {
  const {view}=await searchParams;
  return <main className="play-page"><ChallengeNav/><section className="play-shell"><header><h1>History &amp; progress</h1><p>Your practice, ready to pick up again.</p></header><HistoryHub initialView={view}/></section></main>;
}
