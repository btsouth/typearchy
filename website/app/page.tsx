'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import TypearchyGame from './TypearchyGame';

const modes = [
  { key: 'SPRINT', label: '01', note: 'WORDS OR PROSE / 15 / 30 / 60 SEC', title: 'Timed speed test.', copy: 'Raw words or grammatical prose under the same clock.', sample: 'clear systems reward steady attention', signal: 'WPM + ACC', finish: 'CLOCK' },
  { key: 'DAILY', label: '02', note: 'FULL PARAGRAPH / SAME UTC PROMPT', title: 'One prompt per day.', copy: 'A meaningful benchmark shared by every player.', sample: 'the same full paragraph meets every pair of hands today', signal: 'WPM + ACC', finish: 'PROMPT' },
  { key: 'QUOTE RELAY', label: '03', note: '4 EXCERPTS / 1 SCORE', title: 'Long-form quotes.', copy: 'Four computing excerpts in one continuous test.', sample: 'four voices move through one test without breaking flow', signal: 'WPM + ACC', finish: '4 EXCERPTS' },
  { key: 'SHELL', label: '04', note: '15 / 30 / 60 SEC', title: 'Timed terminal practice.', copy: 'Multiline command sets with real flags and pipes.', sample: 'git status --short\ngit diff --stat\nrg --files | sort', signal: 'WPM + ACC', finish: 'CLOCK' },
  { key: 'CODE', label: '05', note: '15 / 30 / 60 SEC', title: 'Timed code practice.', copy: 'Multiline Bash, Python, JavaScript, and Rust.', sample: 'function clamp(value, low, high) {\n  return Math.max(low, Math.min(high, value))\n}', signal: 'WPM + ACC', finish: 'CLOCK' },
  { key: 'DRILL', label: '06', note: 'RECENT MISTAKES / NATURAL TEXT', title: 'Adaptive practice.', copy: 'Readable passages weighted toward the keys and pairs you miss.', sample: 'steady practice turns difficult patterns into reliable motion', signal: 'TARGET ERRORS', finish: 'PASSAGE' },
  { key: 'CUSTOM', label: '07', note: 'YOUR OWN TEXT', title: 'Local passages.', copy: 'Type your own text. Nothing is uploaded.', sample: 'local text in local storage under your control', signal: 'YOUR METRICS', finish: 'PASSAGE' },
];

const history = [
  ['TODAY 08:42', 'SPRINT 30', '94', '98.1%', '+3'],
  ['TODAY 08:37', 'DRILL', '81', '99.0%', '+7'],
  ['YESTERDAY', 'QUOTE RELAY', '87', '97.2%', '+1'],
  ['AUG 26', 'SHELL', '76', '96.8%', '+5'],
  ['AUG 25', 'DAILY', '91', '98.4%', 'PB'],
];

function SharePreview() {
  const [copied, setCopied] = useState(false);
  const resultUrl = 'https://typearchy.com/r/7K2M9Q';
  const result = `TYPEARCHY / DAILY #241\n94 WPM  |  98% ACC\nPACE  ▁▂▄▅▆▇▆█\nBEAT THIS RUN  ${resultUrl}`;

  const copyResult = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="share-section">
      <div className="share-copy">
        <p className="section-tag">05 / SHARE</p>
        <h2>Share a score. Start a rematch.</h2>
        <p>Short result URLs open the same challenge. Passages and keystrokes stay private.</p>
        <div className="share-actions">
          <button type="button" onClick={copyResult}>{copied ? 'COPIED TO CLIPBOARD' : 'COPY DEMO RESULT'}</button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/r/7K2M9Q">OPEN SHARE PAGE</a>
        </div>
        <code className="result-url">typearchy.com/r/7K2M9Q</code>
      </div>
      <div className="share-card" aria-label="Example Typearchy Daily result card">
        <div className="share-card-head"><strong>TYPEARCHY</strong><span>DAILY #241</span></div>
        <div className="share-score"><small>WPM</small><b>94</b></div>
        <div className="share-grid"><span><small>ACCURACY</small>98%</span><span><small>STREAK</small>12 DAYS</span><span><small>PERSONAL BEST</small>+3</span></div>
        <div className="share-pace" aria-label="Words per minute pace rose through the run"><span>PACE</span><div>{[24, 37, 46, 58, 64, 78, 70, 92, 84, 100, 89, 94].map((value, index) => <i key={index} style={{ height: `${value}%` }} />)}</div><b>94 WPM</b></div>
        <div className="share-card-foot"><span>KEEP YOUR FINGERS SHARP.</span><span>TYPEARCHY.COM/R/7K2M9Q</span></div>
      </div>
    </section>
  );
}

function ProfilePreview() {
  return (
    <section className="profile-preview-section" id="profiles">
      <div className="profile-preview-copy">
        <p className="section-tag">06 / PROFILE</p>
        <h2>Public profiles.</h2>
        <p>Publish selected scores, comparable personal bests, progress, and a pinned ghost.</p>
        <div className="profile-preview-actions">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/u/bts">VIEW @BTS PROFILE</a>
          <span>OPTIONAL / OPT-IN</span>
        </div>
      </div>
      <div className="profile-preview-card" aria-label="Preview of the @bts Typearchy public profile">
        <div className="profile-preview-head"><div className="mini-avatar">B</div><div><small>TYPEARCHY PLAYER</small><strong>@bts</strong></div><span>OSAKA JADE</span></div>
        <div className="profile-preview-best"><span>ALL-TIME BEST</span><div><b>112</b><small>WPM</small></div><p>SPRINT / 15 SEC&nbsp;&nbsp;·&nbsp;&nbsp;98% ACC</p></div>
        <div className="profile-preview-stats"><span><small>LAST 10 AVG</small>94 WPM</span><span><small>STREAK</small>12 DAYS</span><span><small>PUBLIC RUNS</small>43</span></div>
        <div className="profile-preview-bars" aria-label="Recent speed trend rose from 72 to 104 words per minute">{[38, 45, 42, 53, 50, 62, 58, 69, 73, 67, 82, 78, 91, 86, 100].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
        <div className="profile-preview-foot"><span>PINNED GHOST / WATCH + CHALLENGE</span><span>TYPEARCHY.COM/U/BTS</span></div>
      </div>
    </section>
  );
}

export default function Home() {
  const [activeMode, setActiveMode] = useState(4);
  const mode = useMemo(() => modes[activeMode], [activeMode]);

  return (
    <main>
      <a className="skip-link" href="#modes">SKIP TO CONTENT</a>
      <nav className="site-nav" aria-label="Primary navigation">
        <a className="wordmark" href="#top" aria-label="Typearchy home"><span className="mark">T</span><span>TYPEARCHY</span></a>
        <div className="nav-links"><a href="/play">PLAY</a><a href="#modes">MODES</a><a href="#progress">PROGRESS</a><a href="#profiles">PROFILES</a><a href="#install">INSTALL</a></div>
        <div className="nav-meta"><span>OMARCHY NATIVE</span><span className="status-dot" /><span>LOCAL FIRST</span></div>
      </nav>
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">AI CAN TAKE THE DICTATION.</p>
          <h1>KEEP YOUR<br />FINGERS SHARP.</h1>
          <p className="lede">Local-first typing for Omarchy. Timed tests, code and shell practice, weak-key drills, history, ghosts, and shareable challenges.</p>
          <div className="hero-actions"><a className="primary-action" href="#typing-demo" onClick={() => window.setTimeout(() => (document.querySelector('.demo-input') as HTMLTextAreaElement | null)?.focus(), 0)}>PLAY IN THE BROWSER</a><span className="release-note">07 MODES / 06 THEMES / LOCAL HISTORY</span></div>
        </div>
        <TypearchyGame compact />
      </section>
      <div className="signal-band" aria-label="Typearchy product facts">
        <span><b>07</b> MODES</span><span><b>04</b> CODE LANGUAGES</span><span><b>500</b> LOCAL RUNS</span><span><b>00</b> REQUIRED ACCOUNTS</span><span><b>01</b> DAILY TEST</span>
      </div>

      <section className="modes-section" id="modes">
        <div className="section-head"><div><p className="section-tag">01 / MODES</p><h2>Seven modes.</h2></div><p>Timed words or prose, Daily runs, quotes, code, shell, weak-key drills, and local text.</p></div>
        <div className="mode-rail" role="tablist" aria-label="Typearchy modes">
          {modes.map((item, index) => <button key={item.key} id={`mode-tab-${index}`} aria-controls="mode-panel" className={index === activeMode ? 'active' : ''} type="button" role="tab" aria-selected={index === activeMode} onClick={() => setActiveMode(index)} onKeyDown={(event) => {
            if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
            event.preventDefault();
            const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + modes.length) % modes.length;
            setActiveMode(next);
            (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
          }}><small>{item.label}</small><span>{item.key}</span></button>)}
        </div>
        <div className="mode-stage" id="mode-panel" role="tabpanel" aria-labelledby={`mode-tab-${activeMode}`}>
          <div className="mode-copy"><p>{mode.note}</p><h3>{mode.title}</h3><span>{mode.copy}</span></div>
          <div className="mode-sample" aria-live="polite">
            <div className="mode-sample-head"><span>{mode.key} / READY</span><span>MODE {mode.label} OF 07</span></div>
            <p>{mode.sample}<i /></p>
            <div className="mode-bars" aria-hidden="true">{[5, 8, 4, 10, 7, 12, 6, 11, 9, 13, 8, 14, 10, 12].map((height, index) => <i key={index} style={{ height: `${height + activeMode * (index % 3)}px` }} />)}</div>
            <div className="mode-sample-meta"><span><small>MEASURES</small>{mode.signal}</span><span><small>FINISH</small>{mode.finish}</span><b>ENTER STARTS&nbsp;&nbsp;ESC EXITS</b></div>
          </div>
        </div>
      </section>

      <section className="progress-section" id="progress">
        <div className="progress-copy"><p className="section-tag">02 / PROGRESS</p><h2>History that changes the next test.</h2><p>Local trends, personal bests, and adaptive drills.</p><div className="loop-line" aria-label="Typearchy practice loop"><span>MISTAKES</span><i>→</i><span>WEAK PAIRS</span><i>→</i><span>DRILL</span><i>→</i><span>RETEST</span></div></div>
        <div className="history-panel">
          <div className="panel-title"><div><strong>HISTORY</strong><span>DEMO PROFILE / 43 RUNS</span></div><div><small>12 DAY</small><b>STREAK</b></div></div>
          <div className="history-summary"><span><small>TODAY</small>94 WPM</span><span><small>BEST</small>112 WPM</span><span><small>AVG ACC</small>97.4%</span></div>
          <div className="trend-plot" aria-label="Fourteen-run speed trend from 74 to 94 words per minute"><span>14 RUN TREND</span><div>{[40, 48, 43, 55, 51, 62, 58, 66, 71, 63, 78, 74, 86, 94].map((value, index) => <i key={index} style={{ height: `${value}%` }} />)}</div><b>+14.8%</b></div>
          <div className="history-table">{history.map((row) => <div className="history-row" key={`${row[0]}-${row[1]}`}>{row.map((cell, index) => <span key={`${cell}-${index}`} className={index === 4 ? 'gain' : ''}>{cell}</span>)}</div>)}</div>
          <div className="weak-keys"><span>NEXT DRILL</span><b>R&nbsp;&nbsp;T&nbsp;&nbsp;TH&nbsp;&nbsp;ER</b><small>WEIGHTED FROM RECENT ERRORS</small></div>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="history-profile-link" href="/u/bts">OPEN PUBLIC PROFILE&nbsp;&nbsp;→</a>
        </div>
      </section>

      <section className="ghost-section">
        <div className="ghost-visual"><Image src="/assets/ghost.png" width={2560} height={1440} sizes="(max-width: 1040px) 100vw, 62vw" alt="Typearchy ghost race showing a live run against a previous personal best" /></div>
        <div className="ghost-copy"><p className="section-tag">03 / GHOST</p><h2>Race a previous run.</h2><p>A comparable personal best supplies the live pace reference.</p><div className="ghost-stat"><span>YOU</span><b>92 WPM</b><i>+4 WPM</i><span>GHOST</span><b>88 WPM</b></div></div>
      </section>

      <section className="product-section">
        <div className="section-head"><div><p className="section-tag">04 / PRODUCT</p><h2>The desktop app.</h2></div><p>Sprint, Quote Relay, History, and Custom mode.</p></div>
        <div className="strip-guide"><span>REAL PRODUCT CAPTURES</span><span>SCROLL TO EXPLORE →</span></div>
        <div className="product-strip" tabIndex={0} aria-label="Scrollable Typearchy product gallery">
          <figure><div className="shot-index">A / SPRINT</div><Image src="/assets/sprint-run.png" width={2560} height={1440} sizes="76vw" alt="Typearchy Sprint typing test" /><figcaption>Live pace and accuracy.</figcaption></figure>
          <figure><div className="shot-index">B / QUOTE RELAY</div><Image src="/assets/quote-relay.png" width={2560} height={1440} sizes="64vw" alt="Typearchy Quote Relay mode" /><figcaption>Four excerpts, one result.</figcaption></figure>
          <figure><div className="shot-index">C / HISTORY</div><Image src="/assets/history.png" width={2560} height={1440} sizes="76vw" alt="Typearchy local run history" /><figcaption>Local run history.</figcaption></figure>
          <figure><div className="shot-index">D / CUSTOM</div><Image src="/assets/custom.png" width={2560} height={1440} sizes="64vw" alt="Typearchy custom passage mode" /><figcaption>Local custom passages.</figcaption></figure>
        </div>
      </section>

      <SharePreview />

      <ProfilePreview />

      <section className="local-section">
        <div><p className="section-tag">07 / LOCAL</p><h2>Local by default.</h2><p>Runs, passages, settings, and personal bests stay on your machine. Sharing is explicit.</p></div>
        <pre aria-label="Example local Typearchy data">{`{
  "runs": 43,
  "streak": 12,
  "best_wpm": 112,
  "weak_pairs": ["tr", "io", "p;"],
  "sync": false
}`}</pre>
      </section>

      <section className="install-section" id="install">
        <p className="section-tag">08 / INSTALL</p><h2>Install and type.</h2><p>Local plugin now. Public repository and shared Daily challenge at launch.</p>
        <div className="launch-status" aria-label="Typearchy launch progress"><span className="complete"><i />DOMAIN SECURED</span><span className="complete"><i />PLUGIN RUNNING</span><span><i />PUBLIC REPOSITORY NEXT</span></div>
        <div className="install-command"><span>$</span><code>omarchy plugin add [typearchy repository] --enable</code><b>REPOSITORY PUBLISHES AT LAUNCH</b></div><a href="#top">PLAY THE DEMO AGAIN ↑</a>
      </section>

      <footer><a className="wordmark" href="#top"><span className="mark">T</span><span>TYPEARCHY</span></a><p>KEEP YOUR FINGERS SHARP.</p><span>TYPEARCHY.COM / 2026</span></footer>
    </main>
  );
}
