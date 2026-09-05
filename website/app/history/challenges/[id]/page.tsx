import ChallengeNav from '../../../challenges/ChallengeNav';
import PrivateChallengeResult from './PrivateChallengeResult';
export const metadata={title:'Your challenge result | Typearchy',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}) {
 return <main className="result-page"><ChallengeNav/><PrivateChallengeResult id={(await params).id}/></main>;
}
