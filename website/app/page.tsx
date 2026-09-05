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
          <p className="eyebrow">A TYPING GAME FOR EVERYONE</p>
          <h1>FIND YOUR<br />TYPING RHYTHM.</h1>
          <p className="lede">Practice words, race the clock, or test yourself on real code. Build speed, improve accuracy, and challenge friends. No coding experience needed.</p>
          <div className="hero-actions">
            <a className="primary-action" href="#typing-demo">PLAY NOW</a>
            <a className="secondary-action" href="#install">GET THE OMARCHY APP</a>
          </div>
          <ul className="expected" aria-label="What is included"><li>WORDS &amp; PASSAGES</li><li>TIMED SPRINTS</li><li>DAILY TESTS</li><li>MISTYPE DRILLS</li><li>CODE PRACTICE</li><li>NO ACCOUNT TO START</li></ul>
        </div>
        <TypearchyGame compact />
      </section>

      <section className="why" aria-label="Ways to play">
        <article><span>01</span><h2>Make time for a little practice.</h2><p>Type words and passages, race the clock, or try the daily test. Follow your speed and accuracy, then race your personal-best ghost.</p></article>
        <article><span>02</span><h2>Work on the keys you miss.</h2><p>Turn your frequent mistypes into focused drills. Practice the letters and combinations that slow you down, at your own pace.</p></article>
        <article><span>03</span><h2>Get comfortable typing code.</h2><p>Practice Ruby, Python, JavaScript, Bash, and Rust, or try a challenge with real Rails code. Type the punctuation and indentation too.</p></article>
        <article><span>04</span><h2>Give friends a run to race.</h2><p>Create a challenge from your own passage. Share your result with a replay, and let friends race your ghost on the same text. Anyone can try it in the browser.</p></article>
      </section>

      <section className="app" id="install">
        <div className="app-copy">
          <p className="section-tag">THE OMARCHY APP</p>
          <h2>Practice on your desktop.</h2>
          <p>The native Omarchy app brings words, drills, and code practice to your desktop, with offline practice and your Omarchy colors. Connect it to your web profile to share results and race the same challenges in either place.</p>
          <div className="install-command"><span>$</span><code>git clone {GITHUB}.git &amp;&amp; ./typearchy/bin/typearchy-install</code></div>
          <p className="app-note">Practice history stays on each device; export and import it to move it. Works on Omarchy and other Linux desktops with Quickshell. To update, pull and run the installer again. <a href={`${GITHUB}#install`} target="_blank" rel="noopener noreferrer">Install notes and source on GitHub ↗</a></p>
        </div>
        <div className="app-shots">
          <Image src="/assets/app-result.png" width={1120} height={748} sizes="(max-width: 1040px) 100vw, 56vw" alt="Typearchy result card showing 78 words per minute, the comparable best, a pace graph, and sharing actions" priority={false} />
          <Image src="/assets/app-history.png" width={1120} height={748} sizes="(max-width: 1040px) 100vw, 56vw" alt="Typearchy history with recent speed, weak keys, and each result labelled local, public, pinned, or paused" />
        </div>
      </section>

      <footer><a className="wordmark" href="#top"><span className="mark">T</span><span>TYPEARCHY</span></a><p>FIND YOUR TYPING RHYTHM.</p><span><a href={GITHUB} target="_blank" rel="noopener noreferrer">GITHUB</a> / MIT / 2026</span></footer>
    </main>
  );
}
