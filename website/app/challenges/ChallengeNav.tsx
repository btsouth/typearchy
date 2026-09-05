export default function ChallengeNav() {
  return <nav className="challenge-nav" aria-label="Main navigation">
    <a className="wordmark" href="/play"><span className="mark">T</span>TYPEARCHY</a>
    <div><a href="/play">Type</a><a href="/challenges">Challenges</a><a href="/account">Profile</a></div>
  </nav>;
}
