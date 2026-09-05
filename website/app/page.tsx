import Image from 'next/image';
import TypearchyGame from './TypearchyGame';

const GITHUB = 'https://github.com/btsouth/typearchy';

export default function Home() {
  return (
    <main className="home">
      <a className="skip-link" href="#typing-demo">SKIP TO THE GAME</a>
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="wordmark" href="#top" aria-label="Typearchy home"><span className="mark">T</span><span>TYPEARCHY</span></a>
        <div className="nav-links"><a href="/play">PLAY</a><a href="/challenges">CHALLENGES</a><a href="/account">PROFILE</a><a href={GITHUB} target="_blank" rel="noopener noreferrer">GITHUB</a></div>
        <div className="nav-meta"><span>BROWSER</span><span className="status-dot" /><span>LINUX APP</span></div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">THE TYPING GAME FOR PEOPLE WHO WRITE CODE</p>
          <h1>KEEP YOUR<br />FINGERS SHARP.</h1>
          <p className="lede">Practice words and code, race real Rails excerpts, and send a friend your time to beat. Play here or install the Linux app.</p>
          <div className="hero-actions">
            <a className="primary-action" href="#typing-demo">PLAY NOW</a>
            <a className="secondary-action" href="#install">GET THE LINUX APP</a>
          </div>
          <ul className="expected" aria-label="What is included"><li>TIMED SPRINTS</li><li>WPM · ACCURACY · CONSISTENCY</li><li>ONE DAILY TEST FOR EVERYONE</li><li>500 RUNS OF LOCAL HISTORY</li><li>PERSONAL-BEST GHOST</li><li>ADAPTIVE DRILLS</li><li>SIX THEMES</li><li>NO ACCOUNT TO PRACTICE</li></ul>
        </div>
        <TypearchyGame compact />
      </section>

      <section className="why" aria-label="What makes Typearchy different">
        <article><span>01</span><h2>Type the code, not around it.</h2><p>Five languages, real indentation, and every mistake corrected before a run counts. A fast Ruby time means you typed the Ruby.</p></article>
        <article><span>02</span><h2>Challenge anyone with a link.</h2><p>Paste a passage, get a URL, send it. Friends race your recorded run on the same text and land on the same standings. Guests can play; connecting a handle keeps the time.</p></article>
        <article><span>03</span><h2>Shareable runs, local by default.</h2><p>Practice stays on your machine. Publish a result when you want a link with a replay and a social card, and take it back down whenever you like.</p></article>
      </section>

      <section className="app" id="install">
        <div className="app-copy">
          <p className="section-tag">THE LINUX APP</p>
          <h2>Practice on your desktop.</h2>
          <p>Practice offline with your Omarchy colors. Use the same profile and race the same challenges in the app or browser. Practice history stays on each device; export and import it when you want to move it.</p>
          <div className="install-command"><span>$</span><code>git clone {GITHUB}.git &amp;&amp; ./typearchy/bin/typearchy-install</code></div>
          <p className="app-note">Omarchy or any Linux desktop with Quickshell. To update, pull and run the installer again. <a href={`${GITHUB}#install`} target="_blank" rel="noopener noreferrer">Install notes and source on GitHub ↗</a></p>
        </div>
        <div className="app-shots">
          <Image src="/assets/app-result.png" width={1120} height={748} sizes="(max-width: 1040px) 100vw, 56vw" alt="Typearchy result card showing 78 words per minute, the comparable best, a pace graph, and sharing actions" priority={false} />
          <Image src="/assets/app-history.png" width={1120} height={748} sizes="(max-width: 1040px) 100vw, 56vw" alt="Typearchy history with recent speed, weak keys, and each result labelled local, public, pinned, or paused" />
        </div>
      </section>

      <footer><a className="wordmark" href="#top"><span className="mark">T</span><span>TYPEARCHY</span></a><p>KEEP YOUR FINGERS SHARP.</p><span><a href={GITHUB} target="_blank" rel="noopener noreferrer">GITHUB</a> / MIT / 2026</span></footer>
    </main>
  );
}
