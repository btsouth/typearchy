import Link from 'next/link';

export default function ChallengeNav() {
  return <nav className="challenge-nav" aria-label="Main navigation">
    <Link className="wordmark" href="/" aria-label="Typearchy home"><span className="mark">T</span>TYPEARCHY</Link>
    <div><a href="/play">Type</a><a href="/history">History</a><a href="/challenges">Challenges</a><a href="/account">Profile</a></div>
  </nav>;
}
